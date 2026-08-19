! ===============================================================================
! ExecBlockAttrs.gs — Side-table for dynamic attributes on GemStone primitive
! closures (ExecBlock).
!
! GemStone's primitive ExecBlock has no varying instVars, so the default
! Object>>__setattr__ path (dynamicInstVarAt:put: on the receiver) raises an
! ImproperOperation.  Python code legitimately tags closures with metadata —
! jinja2.async_utils sets ``wrapper.jinja_async_variant = True'' on a nested
! decorator-output closure, ``functools.partial(fn).__module__'' reads back a
! stamped value, etc.  Without a side-table, the surrounding decorator chain
! dies the first time a closure-shaped value gets ``setattr''-ed.
!
! Storage is an ``IdentityKeyValueDictionary'' keyed by ExecBlock identity,
! values are per-block ``KeyValueDictionary{ name (String) -> value }''.
! Strong refs — decorated closures live for the host module's lifetime
! anyway, and the typical usage (module-init time) attaches a bounded
! number of entries.  Replace with a WeakKeyDictionary once we have a
! profile that warrants it.
!
! TWO namespaces, mirroring CPython's split between a function's SLOTS and
! its ``__dict__'':
!
!   * the DICT table (``forBlock:'' / ``at:attr:'' / ``at:attr:put:'') holds
!     ordinary user attributes and IS what ``func.__dict__'' exposes.
!   * the SLOT table (``slotsFor:'' / ``slotAt:attr:'' / ``slotAt:attr:put:'')
!     holds the six identifying-metadata dunders CPython implements as
!     getset descriptors: __name__ __qualname__ __module__ __doc__
!     __annotations__ __type_params__.
!
! The split is not cosmetic.  ``functools.update_wrapper'' MERGES the wrapped
! function's ``__dict__'' into the wrapper's, so anything visible there gets
! copied wholesale; Grail stamps ``__name__'' / ``__annotations__'' into the
! side table at def time, and with one shared table those internal stamps
! would surface as user ``__dict__'' entries.  CPython keeps them out:
!
!     def f(): pass
!     f.__dict__            # {} -- not {'__name__': 'f'}
!     f.__wrapped__ = 1
!     f.__dict__            # {'__wrapped__': 1} -- __wrapped__ IS a dict entry
!
! ``__setattr__'' routes by name (see ExecBlock >> ___isSlotName___:), so a
! given name lives in exactly one of the two tables.
! ===============================================================================

! ------------------- Superclass / dictionary check
run
Object ifNil: [self error: 'Object is not defined.'].
(System myUserProfile symbolList objectNamed: #'Python')
	ifNil: [self error: 'Python dictionary is not defined. Check file ordering.'].
%


! ------------------- ExecBlockAttrs class definition
expectvalue /Class
doit
Object subclass: 'ExecBlockAttrs'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ExecBlockAttrs comment:
'Side-table for ExecBlock dynamic-attribute storage.  GemStone primitive
closures have no varying instVars; this class brokers an
IdentityKeyValueDictionary keyed by ExecBlock identity so
``block.attr = value'' / ``block.attr'' round-trip through __setattr__
and __getattr__ overrides on ExecBlock.

There are TWO independent tables, matching CPython''s split between a
function''s getset SLOTS and its ``__dict__'':

  * the DICT table (forBlock: / at:attr: / at:attr:put:) -- ordinary user
    attributes; this is what ``func.__dict__'' hands back, live.
  * the SLOT table (slotsFor: / slotAt:attr: / slotAt:attr:put:) --
    __name__ __qualname__ __module__ __doc__ __annotations__
    __type_params__, which CPython keeps OUT of __dict__.

Keeping Grail''s def-time __name__ / __annotations__ stamps in the slot
table is what stops functools.update_wrapper (which merges the wrapped
function''s whole __dict__ into the wrapper) from treating them as user
attributes.

Both dictionaries are initialized lazily on first use, and both
auto-create their per-block sub-dictionary on demand.
'
%

expectvalue /Class
doit
ExecBlockAttrs category: 'Grail-Modules'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ExecBlockAttrs removeAllMethods.
ExecBlockAttrs class removeAllMethods.
%

! ------------------- Class-side accessors

set compile_env: 0

category: 'Grail-Access'
classmethod: ExecBlockAttrs
table
	"The IdentityKeyValueDictionary keyed by ExecBlock identity.
	Stored in ``SessionTemps current'' so the dictionary is
	per-session and mutable without security-policy gymnastics —
	committed mutable storage (class-side instVars on a class
	whose policy is owned by SystemUser) raises SecurityError when
	an ordinary (non-SystemUser) user's session tries to write.  ExecBlocks
	themselves are transient (not committable), so per-session
	storage matches the lifetime of the values being indexed."

	^ SessionTemps current
		at: #'___ExecBlockAttrsTable___'
		ifAbsentPut: [IdentityKeyValueDictionary new]
%

category: 'Grail-Write Guards'
classmethod: ExecBlockAttrs
___pyClassNamed___: aSymbol
	"A Python type class by name, or nil.  Looked up at RUNTIME rather than named
	as a compile-time global: ExecBlockAttrs.gs is filed before Tuple.gs / PyDict.gs
	/ PyCode.gs, so naming them directly is an ``undefined symbol'' at install
	time.  A class that cannot be resolved skips its check rather than failing the
	write."

	^ Python at: aSymbol otherwise: nil
%

category: 'Grail-Write Guards'
classmethod: ExecBlockAttrs
___readOnlyFunctionAttrs___
	"The function attributes with NO setter at all.  CPython answers
	``AttributeError: readonly attribute'' for these -- note that is the FUNCTION
	wording; BoundMethod's twin says ``attribute 'x' of 'method' objects is not
	writable'', because CPython words the two object kinds differently and
	test_funcattrs reads both."

	^ #( #'__closure__' #'__globals__' #'__builtins__' )
%

category: 'Grail-Write Guards'
classmethod: ExecBlockAttrs
___checkFunctionWrite___: aName value: aValue
	"CPython's func_set_* guards, which Grail had NONE of: every write to a
	function attribute was accepted, including the ones that leave the object
	incoherent.  ``f.__name__ = 7'' put an integer where every traceback, repr and
	pickle expects a string; ``f.__closure__ = ()'' discarded the cells the body
	reads; ``f.__defaults__ = 7'' left a non-tuple where the call path expects one.
	None of it raised, and the damage surfaced later, somewhere else -- which is
	the whole reason CPython checks at the point of assignment.

	TWO KINDS OF RULE, with a DIFFERENT exception each, so they are not
	interchangeable: read-only attributes raise AttributeError (there is no
	setter), type-checked ones raise TypeError (there is a setter and the VALUE is
	what is wrong).

	The rules mirror BoundMethod class>>___checkFunctionAttrWritable___:writing:,
	which has enforced them for methods all along; only the read-only wording
	differs, per CPython."

	| sym |
	sym := aName asSymbol.
	(self ___readOnlyFunctionAttrs___ includes: sym) ifTrue: [
		^ (System myUserProfile symbolList objectNamed: #'AttributeError')
			@env1:___signal___: 'readonly attribute'].
	(sym == #'__name__' or: [sym == #'__qualname__']) ifTrue: [
		(aValue isKindOf: CharacterCollection) ifFalse: [
			^ (System myUserProfile symbolList objectNamed: #'TypeError')
				@env1:___signal___: (sym asString , ' must be set to a string object')].
		^ self].
	sym == #'__code__' ifTrue: [
		| c |
		c := self ___pyClassNamed___: #'PyCode'.
		(c notNil and: [(aValue isKindOf: c) not]) ifTrue: [
			^ (System myUserProfile symbolList objectNamed: #'TypeError')
				@env1:___signal___: '__code__ must be set to a code object'].
		^ self].
	sym == #'__defaults__' ifTrue: [
		| t none |
		t := self ___pyClassNamed___: #'tuple'.
		none := System myUserProfile symbolList objectNamed: #'None'.
		(aValue == none or: [aValue isNil]) ifTrue: [^ self].
		(t notNil and: [(aValue isKindOf: t) not]) ifTrue: [
			^ (System myUserProfile symbolList objectNamed: #'TypeError')
				@env1:___signal___: '__defaults__ must be set to a tuple object'].
		^ self].
	^ self
%

category: 'Grail-Write Guards'
classmethod: ExecBlockAttrs
___checkFunctionDelete___: aName
	"``delattr'' has its OWN rules, and they are not simply ``the same as
	setattr''.  test_funcattrs checks both directions for every guarded attribute
	(its cannot_set_attr helper fails unless setattr AND delattr each raise), and
	the answers differ:

	  * read-only     -> AttributeError, as for the write;
	  * __name__ / __qualname__ / __code__ -> TypeError, phrased as the SET
	    message, because CPython routes the delete through the same setter with a
	    NULL value;
	  * __defaults__  -> LEGAL, clearing them to None (handled by the caller, not
	    refused here).

	Answers true when the caller should carry on and clear the slot, false when
	the name is not one of these."

	| sym |
	sym := aName asSymbol.
	(self ___readOnlyFunctionAttrs___ includes: sym) ifTrue: [
		^ (System myUserProfile symbolList objectNamed: #'AttributeError')
			@env1:___signal___: 'readonly attribute'].
	((sym == #'__name__') or: [(sym == #'__qualname__')]) ifTrue: [
		^ (System myUserProfile symbolList objectNamed: #'TypeError')
			@env1:___signal___: (sym asString , ' must be set to a string object')].
	sym == #'__code__' ifTrue: [
		^ (System myUserProfile symbolList objectNamed: #'TypeError')
			@env1:___signal___: '__code__ must be set to a code object'].
	^ false
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
replaceDictFor: aBlock with: aDictionary
	"Make ``aDictionary'' BE this block's __dict__, rather than copying its
	entries into the existing one.

	CPython's ``f.__dict__ = d'' is an identity assignment -- ``f.__dict__ is d''
	is true afterwards, and later mutations of d show through f.  Storing the
	caller's object here is what gives that; merging would leave two mappings
	that agree once and then drift."

	self table at: aBlock put: aDictionary.
	^ aDictionary
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
replaceDictFor: aBlock withChecked: aValue
	"``func.__dict__ = d'' with CPython's type check.

	Without it ``f.__dict__ = None'' was accepted in silence -- and so was any
	other non-mapping -- leaving the function with a __dict__ that could not be
	read back as one.  CPython names the offending type in the message, so this
	does too."

	(aValue isKindOf: KeyValueDictionary) ifFalse: [
		^ (System myUserProfile symbolList objectNamed: #'TypeError')
			@env1:___signal___: '__dict__ must be set to a dictionary, not a '''
				, ((System myUserProfile symbolList objectNamed: #'bytes')
					@env1:___pyTypeNameOf___: aValue) , ''''].
	^ self replaceDictFor: aBlock with: aValue
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
forBlock: aBlock
	"Return the per-block attribute dictionary, creating it on first
	access.  The inner dictionary maps attribute-name Strings to
	values."

	^ self table at: aBlock ifAbsentPut: [KeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
at: aBlock attr: aName
	"Look up the value stored for ``aName'' on ``aBlock''.  Returns
	nil when the slot has never been written — callers detect a
	miss via the nil = absent invariant.  Direct lookup that skips
	the auto-create branch in ``forBlock:'' so a pure read doesn't
	pin the block in the side-table by accident."

	| holder v |
	holder := self table at: aBlock ifAbsent: [nil].
	holder ifNotNil: [
		v := holder at: aName asString ifAbsent: [nil].
		v ifNotNil: [^ v]].
	"``__defaults__'' is COMPUTED on a miss rather than stored -- see
	___defaultsFor___:.  After the table, so that an explicit ``f.__defaults__
	= X'' (and ``del f.__defaults__'', which writes None) still wins: the stamp
	is the function's initial value, exactly as CPython has it."
	(aName asString = '__defaults__') ifTrue: [^ self ___defaultsFor___: aBlock].
	^ nil
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
at: aBlock attr: aName put: aValue
	"Store ``aValue'' under ``aName'' on ``aBlock''.  Auto-creates
	the per-block sub-dictionary on first write."

	"``func.__defaults__ = t'' is written THROUGH to the temps the call path
	binds from, so the assignment changes what the next call does -- see
	___writeDefaultsFor___:value:.  When it takes effect nothing is stored
	here, so the read recomputes the live values; when the shape cannot carry
	it, the value falls through to the table as before."
	(aName asString = '__defaults__') ifTrue: [
		(self ___writeDefaultsFor___: aBlock value: aValue) ifTrue: [^ aValue]].
	"``func.__dict__ = d'' REPLACES the mapping; every other name is an entry IN
	it.  Intercepted here rather than in ExecBlock>>__setattr__ (which is where
	the routing arguably belongs) for a reason worth recording: on a legacy 3.7
	kernel ExecBlock.gs is filed ONCE as SHARED SystemUser methods by
	install_base.sh, so changing it means writing unmerged kernel code into an
	extent other users are working in.  ExecBlockAttrs is per-user on both
	kernels, and the shared ExecBlock already delegates every attribute store
	here, so this placement needs no shared-base change and behaves identically
	on 3.7 and 4.0."
	(aName asString = '__dict__') ifTrue: [
		^ self replaceDictFor: aBlock withChecked: aValue].
	"CPython's func_set_* guards.  Reached here as well as from the slot path
	because the guarded names are split across the two namespaces -- __name__ and
	__qualname__ are slots, __closure__ and __globals__ are not."
	self ___checkFunctionWrite___: aName value: aValue.
	(self forBlock: aBlock) at: aName asString put: aValue.
	^ aValue
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
removeAt: aBlock attr: aName
	"Remove ``aName'' from ``aBlock'''s __dict__ table.  Answers true when
	an entry was actually removed, false when the slot was never written —
	``del block.attr'' has to tell those apart so a missing attribute
	raises AttributeError rather than silently succeeding."

	| holder |
	"``del f.__dict__'' is a TypeError in CPython, not an AttributeError: the
	attribute exists and is writable, so what is refused is the DELETION.  Before,
	this fell through to the ``never written'' branch and reported the attribute
	missing -- a different error, and one that reads as though functions have no
	__dict__ at all."
	(aName asString = '__dict__') ifTrue: [
		^ (System myUserProfile symbolList objectNamed: #'TypeError')
			@env1:___signal___: 'cannot delete __dict__'].
	"``del f.__doc__'' RESETS the docstring to None rather than removing an
	attribute -- CPython's func_set_doc(NULL).  __doc__ lives in the SLOT
	namespace, so it was never in the table this method searches and the read
	below reported it missing: ``AttributeError: __doc__'' for an attribute every
	function has."
	"Read-only names and the string-typed ones refuse the delete outright; this
	raises rather than answering when it applies."
	self ___checkFunctionDelete___: aName.
	"``del f.__defaults__'' is LEGAL and clears them to None."
	(aName asString = '__defaults__') ifTrue: [
		"The DICT table, not the slot table: __defaults__ is not one of the six
		slot names, so that is where a ``f.__defaults__ = ...'' write landed and
		where the reader looks for it."
		self at: aBlock attr: '__defaults__'
			put: (System myUserProfile symbolList objectNamed: #'None').
		^ true].
	(aName asString = '__doc__') ifTrue: [
		self slotAt: aBlock attr: '__doc__'
			put: (System myUserProfile symbolList objectNamed: #'None').
		^ true].
	holder := self table at: aBlock ifAbsent: [^ false].
	(holder includesKey: aName asString) ifFalse: [^ false].
	holder removeKey: aName asString.
	^ true
%

! ------------------- Slot table (the getset dunders, kept out of __dict__)

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotTable
	"The per-session IdentityKeyValueDictionary holding SLOT values —
	__name__ / __qualname__ / __module__ / __doc__ / __annotations__ /
	__type_params__.  Separate from ``table'' (the __dict__ store) because
	CPython implements these as getset descriptors that are NOT dict
	entries, and functools.update_wrapper merges the wrapped function's
	whole __dict__ into the wrapper — with one shared table, Grail's
	def-time __name__ stamp would ride along as a user attribute.

	Same session-local storage rationale as ``table''."

	^ SessionTemps current
		at: #'___ExecBlockSlotsTable___'
		ifAbsentPut: [IdentityKeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotsFor: aBlock
	"Return the per-block SLOT dictionary, creating it on first access."

	^ self slotTable at: aBlock ifAbsentPut: [KeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotTable
	"Slot values that belong to the DEF SITE rather than to one function
	object: ``__name__'', ``__code__'', ``__signature_spec__'' and
	``__annotate__'' as the compiler stamps them.  Every evaluation of the
	same ``def'' produces the same values, so they are keyed by the def site
	instead of by the function object.

	Keyed by ``aBlock method''.  Each block literal gets its OWN GsNMethod,
	so that method is a stable per-def-site identity: two evaluations of one
	def share it, two different defs never do (verified).

	Why this split exists.  The per-object slotTable holds its keys STRONGLY
	and there is no weak-keyed collection available in this GemStone (Globals
	offers only FsFileDescriptorEphemeron and GcWeakReferences; Array has no
	makeWeak).  As long as def-time stamping writes one entry per function
	OBJECT, giving each ``def'' evaluation a fresh object -- which CPython
	semantics require -- makes every function ever created immortal for the
	session; the measured result was ``VM temporary object memory is full''
	at ~100k def evaluations.  Keyed by def site, the same data is bounded by
	the number of defs in the image.

	Same session-local storage rationale as ``table''."

	^ SessionTemps current
		at: #'___ExecBlockStaticSlotsTable___'
		ifAbsentPut: [IdentityKeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotsFor: aBlock
	"The def-site slot dictionary for aBlock, creating it on first access."

	^ self staticSlotTable at: aBlock method ifAbsentPut: [KeyValueDictionary new]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotAt: aBlock attr: aName put: aValue
	"Write a DEF-SITE slot -- what the def-time stamps use.

	Idempotent by construction: every evaluation of the def writes the same
	value under the same key, so a repeat write is skipped rather than
	re-storing it."

	| holder key |
	holder := self staticSlotsFor: aBlock.
	key := aName asString.
	(holder includesKey: key) ifTrue: [^ aValue].
	holder at: key put: aValue.
	"The one moment the function and its cells are known to come from the SAME
	activation, which is what makes the base depth measurable at all -- see
	___closureBaseDepthFrom___:cells:."
	key = '__closure__' ifTrue: [
		holder
			at: '___closureBaseDepth___'
			put: (self ___closureBaseDepthFrom___: aBlock cells: aValue)].
	^ aValue
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
staticSlotAt: aBlock attr: aName
	"Read a DEF-SITE slot directly, nil when unset."

	| holder |
	holder := self staticSlotTable at: aBlock method ifAbsent: [^ nil].
	^ holder at: aName asString ifAbsent: [nil]
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
annotateSlotAt: aBlock attr: aName put: aValue
	"Store ``__annotate__'', which is neither purely def-site nor purely
	per-object, and picks its table by OBSERVING which it is.

	An annotate function is a CLOSURE over the scope enclosing the def, so
	unlike __name__ / __code__ / __signature_spec__ it is not guaranteed to be
	the same value for every execution.  When the annotations name only globals
	(``def f(x: int)'' -- the common case) the emitted block captures nothing,
	so GemStone answers the same clean-block literal every time and the value
	IS def-site data.  When they name an enclosing local (``def make(t): def
	f(x: t)'') a fresh block arrives per execution and storing it per DEF SITE
	would report the first execution's captures for every function built there.

	The two are told apart by comparing against what the def site already
	holds -- no VM introspection required, and exact:

	  * nothing stored yet -> store at the def site.  Costs one entry per def
	    and is correct for the first execution either way, since that entry IS
	    that execution's own block.
	  * the same object arrives again -> a clean block, shared by construction.
	    Nothing to do, and nothing per-object ever accumulates.
	  * a DIFFERENT object arrives -> the block captures, so this execution
	    needs its own.  Write per-object, where it shadows the def-site entry
	    on read.

	So the unbounded per-object growth is confined to defs whose annotations
	actually close over enclosing state, which genuinely cannot share.  Writing
	every annotate per-object instead was measured at one table entry per
	annotated def execution -- 200k entries for 200k executions."

	| existing |
	existing := self staticSlotAt: aBlock attr: aName.
	existing == nil ifTrue: [^ self staticSlotAt: aBlock attr: aName put: aValue].
	existing == aValue ifTrue: [^ aValue].
	^ self slotAt: aBlock attr: aName put: aValue
%

category: 'Grail-Defaults'
classmethod: ExecBlockAttrs
___defaultSlotFor___: aBlock name: aName
	"Where the evaluated default named ``aName'' lives, as { hops. vcSlot }
	from aBlock's captured context, or nil when it cannot be located.

	A def with defaults is emitted inside a wrapper block that evaluates each
	one ONCE into a temp:

	    f := ([ | ___default_a___ |
	             ___default_a___ := 1.
	             [:pos :kw | ... ifFalse: [___default_a___] ] ] value)

	so the value is already computed and simply has to be found.  The function
	block references those temps, so they are in ITS OWN argsAndTemps with the
	documented offset encoding -- the same one GsProcess>>_frameContentsAt:
	reads, and the same one the closure cells are decoded with.

	The lexical level is taken as it comes and reduced by one rather than
	assumed to be 1: a name at level 0 would be the function's own runtime
	context, which does not exist for a function nobody is calling, and level N
	is N-1 hops from the captured context that IS reachable.  Answers nil below
	level 1, which is the honest answer for a temp this walk cannot see."

	| meth names offs idx o |
	meth := [aBlock method] on: Error do: [:ex | ex return: nil].
	meth isNil ifTrue: [^ nil].
	names := meth argsAndTemps.
	offs := meth _argsAndTempsOffsets.
	(names isNil or: [offs isNil]) ifTrue: [^ nil].
	idx := nil.
	1 to: names size do: [:i |
		(idx isNil and: [(names at: i) asString = aName]) ifTrue: [idx := i]].
	(idx isNil or: [idx > offs size]) ifTrue: [^ nil].
	o := offs at: idx.
	(o isKindOf: Integer) ifFalse: [^ nil].
	o > 0 ifFalse: [^ nil].
	(o bitAnd: 16rFF) < 1 ifTrue: [^ nil].
	^ { (o bitAnd: 16rFF) - 1. (o bitShift: -8) + 1 - VariableContext instSize }
%

category: 'Grail-Defaults'
classmethod: ExecBlockAttrs
___defaultedParamNamesFor___: aBlock
	"The TRAILING positional parameters that have defaults, in declaration
	order, or nil when the signature spec is not available.

	Kinds 0 and 1 only (POSITIONAL_ONLY, POSITIONAL_OR_KEYWORD): CPython puts
	keyword-only defaults in __kwdefaults__, which Grail carries separately.  A
	parameter WITH a default is a three-element spec entry and one without is a
	two-element entry, so the third slot is the test -- see
	FunctionDefAst>>emitSignatureEntryFor:."

	| spec wanted |
	spec := self slotAt: aBlock attr: '__signature_spec__'.
	spec isNil ifTrue: [^ nil].
	wanted := OrderedCollection new.
	spec do: [:entry |
		(entry size >= 3 and: [(entry at: 2) <= 1]) ifTrue: [
			wanted add: (entry at: 1) asString]].
	^ wanted
%

category: 'Grail-Defaults'
classmethod: ExecBlockAttrs
___writeDefaultsFor___: aBlock value: aValue
	"``f.__defaults__ = (9,)'' written THROUGH to the temps the call path
	actually binds from, so the assignment changes what the next call does --
	which is the whole point of the attribute being writable.

	Answers true when it took effect and false when it could not, leaving the
	caller to store the value in the table as before.

	WHY IT MATTERS THAT THIS EXISTS AT ALL.  Making __defaults__ merely
	READABLE turned a write-only attribute into a lying one: the assignment
	landed in the side table, the read answered it, and the call went on
	binding the def-time value.  Reporting a default that is not in effect is
	worse than reporting none, so the read and the write had to land together.

	ONLY WHEN THE COUNT MATCHES.  Each default is a temp the def-time wrapper
	block evaluated once, so there are exactly as many slots as the def
	declared defaults, and Grail cannot create more.  A tuple of a different
	length -- CPython re-pairs it with the trailing parameters, and giving
	defaults to a function that declared none is legal there -- has nowhere to
	go; see FunctionDefaultsTestCase for what that costs."

	| wanted base seq |
	(aValue isKindOf: SequenceableCollection) ifFalse: [
		((self ___pyClassNamed___: #'tuple') notNil
			and: [aValue isKindOf: (self ___pyClassNamed___: #'tuple')]) ifFalse: [^ false]].
	seq := aValue.
	wanted := self ___defaultedParamNamesFor___: aBlock.
	(wanted isNil or: [wanted isEmpty]) ifTrue: [^ false].
	wanted size == seq size ifFalse: [^ false].
	base := [aBlock staticLink] on: Error do: [:ex | ex return: nil].
	base isNil ifTrue: [^ false].
	1 to: wanted size do: [:i | | d vc slot |
		d := self ___defaultSlotFor___: aBlock name: '___default_' , (wanted at: i) , '___'.
		d isNil ifTrue: [^ false].
		vc := base.
		(d at: 1) timesRepeat: [vc := vc isNil ifTrue: [nil] ifFalse: [vc parent]].
		slot := d at: 2.
		(vc isNil or: [slot < 1 or: [slot > vc size]]) ifTrue: [^ false].
		vc _at: slot put: (seq at: i)].
	^ true
%

category: 'Grail-Defaults'
classmethod: ExecBlockAttrs
___defaultsFor___: aBlock
	"``func.__defaults__'' -- a tuple of the evaluated defaults of the TRAILING
	positional parameters, or None when the def declares none.  nil when it
	cannot be determined, which leaves the attribute missing as before rather
	than answering a value that might be wrong.

	It was missing outright: ``f.__defaults__'' was an AttributeError for every
	function, though it is an attribute every Python function has, and one that
	inspect and functools both read.

	SYNTHESISED, NOT STORED, and deliberately not faked.  Answering None
	unconditionally would have closed test_blank_func_defaults on the spot and
	made ``def f(a=1, b=2)'' report None as well -- trading a visible failure
	for a quiet lie in the far more common case.  What makes None honest here
	is that the same walk finds the real values when there are any.

	Only kinds 0 and 1 (POSITIONAL_ONLY, POSITIONAL_OR_KEYWORD) count: CPython
	puts keyword-only defaults in __kwdefaults__, which Grail already carries
	separately.  The signature spec records a parameter WITH a default as a
	three-element entry and one without as a two-element entry, so the presence
	of the third slot is the test -- see FunctionDefAst>>emitSignatureEntryFor:."

	| wanted base values |
	wanted := self ___defaultedParamNamesFor___: aBlock.
	wanted isNil ifTrue: [^ (System myUserProfile symbolList objectNamed: #'None')].
	wanted isEmpty ifTrue: [^ (System myUserProfile symbolList objectNamed: #'None')].
	base := [aBlock staticLink] on: Error do: [:ex | ex return: nil].
	base isNil ifTrue: [^ nil].
	values := Array new: wanted size.
	1 to: wanted size do: [:i | | d vc slot |
		d := self ___defaultSlotFor___: aBlock name: '___default_' , (wanted at: i) , '___'.
		d isNil ifTrue: [^ nil].
		vc := base.
		(d at: 1) timesRepeat: [vc := vc isNil ifTrue: [nil] ifFalse: [vc parent]].
		slot := d at: 2.
		(vc isNil or: [slot < 1 or: [slot > vc size]]) ifTrue: [^ nil].
		values at: i put: (vc at: slot)].
	^ (ExecBlock ___pyTupleClass___) perform: #'withAll:' env: 0 withArguments: { values }
%

category: 'Grail-Closures'
classmethod: ExecBlockAttrs
___closureBaseDepthFrom___: aBlock cells: cells
	"How many ``VariableContext>>parent'' hops separate the FUNCTION's captured
	context from the one its READER blocks were created in.  Answers nil when
	it cannot be established, which makes the caller fall back to the stored
	cells.

	Usually zero, and it was assumed zero -- wrongly.  A def WITH DEFAULTS is
	emitted inside an extra block that holds the evaluated defaults,

	    f := ([ | ___default_a___ |
	             ___default_a___ := 1.
	             [:pos :kw | ... ] ] value)
	           shallowCopy ... ___pyClosure___: { PyCell reader: [x] }

	-- and the ___pyClosure___: cascade is OUTSIDE that wrapper.  So the
	function's staticLink is the WRAPPER's context while the readers were
	created one level further out, and a walk starting at the function landed
	on the defaults: ``f.__closure__[0].cell_contents'' answered 1 (the default
	for ``a'') instead of the captured variable.  Silently, and with a value of
	an entirely unrelated kind.

	MEASURED, not inferred from the ``___default_'' naming convention: at the
	moment the def-time stamp runs, the function and its cells belong to one
	activation, so the reader's own context can simply be FOUND in the
	function's parent chain.  A structural property of the def site, so it is
	recorded once beside the cells."

	| target vc depth |
	(cells isNil or: [cells isEmpty]) ifTrue: [^ nil].
	target := [(cells at: 1) ___reader___]
		on: AbstractException do: [:ex | ex return: nil].
	target isNil ifTrue: [^ nil].
	target := [target staticLink] on: Error do: [:ex | ex return: nil].
	target isNil ifTrue: [^ nil].
	vc := [aBlock staticLink] on: Error do: [:ex | ex return: nil].
	depth := 0.
	[vc notNil] whileTrue: [
		vc == target ifTrue: [^ depth].
		vc := vc parent.
		depth := depth + 1].
	^ nil
%

category: 'Grail-Closures'
classmethod: ExecBlockAttrs
___closureSlotForReader___: aCell
	"Decode one def-site cell into { lexicalLevel. vcSlot }, or nil when it
	cannot be decoded.

	The def-time stamp emits ``PyCell reader: [x]'' -- a block whose ONLY temp
	is the free variable, so the block's own method names it and
	``_argsAndTempsOffsets'' says where it lives.  That encoding is documented
	on GsNMethod: the low 8 bits are the number of ``VariableContext>>parent''
	hops to the defining context, and the high bits are a signed offset*256,
	positive when the variable is in a context (rather than on the stack) and
	zero-based with respect to instVar 0.  GsProcess>>_frameContentsAt: is the
	kernel's own reader of the same encoding, and this walks it the same way.

	Answers nil rather than guessing whenever the shape is not the one the
	stamp emits -- no reader, more than one temp, or a stack-allocated
	variable.  The caller then falls back to the stored cells, which is the
	old behaviour: correct where we can prove it, unchanged where we cannot."

	| r meth names offs o |
	aCell isNil ifTrue: [^ nil].
	r := aCell ___reader___.
	r isNil ifTrue: [^ nil].
	meth := r method.
	meth isNil ifTrue: [^ nil].
	names := meth argsAndTemps.
	offs := meth _argsAndTempsOffsets.
	(names isNil or: [offs isNil]) ifTrue: [^ nil].
	(names size == 1 and: [offs size == 1]) ifFalse: [^ nil].
	o := offs at: 1.
	(o isKindOf: Integer) ifFalse: [^ nil].
	o > 0 ifFalse: [^ nil].
	^ { o bitAnd: 16rFF. (o bitShift: -8) + 1 - VariableContext instSize }
%

category: 'Grail-Closures'
classmethod: ExecBlockAttrs
___closureTemplateFor___: aBlock
	"The decoded { lexicalLevel. vcSlot } pairs for this DEF SITE, or nil when
	the site cannot be decoded.

	Def-site data, and stored as such: the slots a def's free variables occupy
	are a property of the compiled code, identical for every evaluation.  Only
	the CONTEXT they are read from varies, and that comes from the function
	object.  The failure answer is memoised too (as #none), so a site that
	cannot be decoded is not re-decoded on every attribute read."

	| cached cells tmpl |
	cached := self staticSlotAt: aBlock attr: '___closureTemplate___'.
	cached isNil ifFalse: [^ cached == #none ifTrue: [nil] ifFalse: [cached]].
	cells := self staticSlotAt: aBlock attr: '__closure__'.
	(cells isNil or: [cells isEmpty]) ifTrue: [^ nil].
	tmpl := Array new: cells size.
	1 to: cells size do: [:i | | d |
		d := self ___closureSlotForReader___: (cells at: i).
		d isNil ifTrue: [
			self staticSlotAt: aBlock attr: '___closureTemplate___' put: #none.
			^ nil].
		tmpl at: i put: d].
	self staticSlotAt: aBlock attr: '___closureTemplate___' put: tmpl.
	^ tmpl
%

category: 'Grail-Closures'
classmethod: ExecBlockAttrs
___closureFor___: aBlock
	"``func.__closure__'' -- built ON DEMAND over THIS function's own captured
	context.

	The bug this exists for: the def-time stamp goes through
	staticSlotAt:attr:put:, which is keyed by def SITE and skips a repeat
	write.  That is right for __name__ and __code__, which every evaluation of
	a def produces identically, and wrong for cells, which capture one
	particular activation -- so ``mk(20).__closure__[0].cell_contents''
	answered ``mk(10)'''s value.  Quietly: a plausible number, from a different
	call, with nothing raised, while ``mk(20)()'' itself was correct all along.

	The per-activation state does not have to be STORED, which was the wrong
	turn in the earlier analysis: ``aBlock staticLink'' IS the enclosing
	activation's VariableContext, already on the function object.  Walk the
	template's lexical levels up from it and the cells can be made fresh, so
	nothing is retained per activation and the def-site table gets SMALLER
	rather than larger.

	MEMOISED PER FUNCTION OBJECT, but only once ``__closure__'' has actually
	been read.  CPython's ``f.__closure__ is f.__closure__'' holds and
	test_scope compares cells with ``is'', so handing back a fresh tuple per
	read would break code that is currently correct.  The per-object table
	holds its keys strongly, so this does retain the function -- but only for
	functions somebody REFLECTED on, which is a vanishing fraction of the defs
	a session evaluates.  Contrast storing at def time, which would retain
	every closure ever created.

	Falls back to the stored cells whenever the site could not be decoded or
	the context walk does not reach a slot -- the old behaviour, rather than a
	guess or an error."

	| tmpl base cells depth |
	tmpl := self ___closureTemplateFor___: aBlock.
	tmpl isNil ifTrue: [^ self staticSlotAt: aBlock attr: '__closure__'].
	base := [aBlock staticLink] on: Error do: [:ex | ex return: nil].
	base isNil ifTrue: [^ self staticSlotAt: aBlock attr: '__closure__'].
	"Step out to the context the READERS were created in before applying each
	cell's own lexical level -- see ___closureBaseDepthFrom___:cells:.  A nil
	depth means it could not be established, so the stored cells stand."
	depth := self staticSlotAt: aBlock attr: '___closureBaseDepth___'.
	depth isNil ifTrue: [^ self staticSlotAt: aBlock attr: '__closure__'].
	depth timesRepeat: [
		base := base isNil ifTrue: [nil] ifFalse: [base parent]].
	base isNil ifTrue: [^ self staticSlotAt: aBlock attr: '__closure__'].
	cells := Array new: tmpl size.
	1 to: tmpl size do: [:i | | d vc slot |
		d := tmpl at: i.
		vc := base.
		(d at: 1) timesRepeat: [
			vc := vc isNil ifTrue: [nil] ifFalse: [vc parent]].
		slot := d at: 2.
		(vc isNil or: [slot < 1 or: [slot > vc size]]) ifTrue: [
			^ self staticSlotAt: aBlock attr: '__closure__'].
		cells at: i put: (PyCell ___overContext___: vc slot: slot)].
	(self slotsFor: aBlock) at: '__closure__' put: cells.
	^ cells
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotAt: aBlock attr: aName
	"Read ``aBlock'''s slot ``aName'', nil when unset.  Direct lookup that
	skips the auto-create branch so a pure read doesn't pin the block.

	PER-OBJECT first, then the DEF SITE.  A runtime write (``setattr'', and
	functools.update_wrapper, which assigns __name__/__doc__/__annotate__ onto
	a wrapper) lands in the per-object table and so shadows what the compiler
	stamped for that def -- which is the ordering CPython has, where the
	stamp is just the function's initial value."

	| holder v |
	holder := self slotTable at: aBlock ifAbsent: [nil].
	holder ifNotNil: [
		v := holder at: aName asString ifAbsent: [nil].
		v ifNotNil: [^ v]].
	"``__closure__'' is not served from the def-site stamp: those cells belong to
	whichever activation happened to run the def FIRST.  See ___closureFor___:,
	which builds them over this function's own captured context and memoises the
	result in the per-object table the read above consults."
	(aName asString = '__closure__') ifTrue: [^ self ___closureFor___: aBlock].
	^ self staticSlotAt: aBlock attr: aName
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
___warnCodeKindMismatch___: aBlock value: aValue
	"``f.__code__ = g.__code__'' across a change of KIND is a DeprecationWarning
	in CPython:

	    Assigning a code object of non-matching type is deprecated
	    (e.g., from a generator to a plain function)

	and it is a warning rather than a refusal because the assignment still
	happens.  What makes it worth warning about is that a function's calling
	protocol is fixed at definition -- a generator's caller expects an iterator
	back, a coroutine's expects an awaitable -- so installing code of another
	kind leaves the two disagreeing, and the failure appears at the next call
	rather than here.

	Only the three KIND bits are compared (see PyCode>>___codeKindBits___).  The
	parameter-shape flags beside them legitimately differ between two functions,
	and comparing whole flag words would warn on almost every assignment.

	The ``warnings'' module is reached through sys.modules rather than named:
	this is an env-0 classmethod with no compile-time handle on the module
	object, the same lookup datetime_module and Float already use.  A session
	that has not imported warnings simply does not warn, which is better than
	failing the assignment over its absence."

	| c cur warningsMod dep |
	c := self ___pyClassNamed___: #'PyCode'.
	c isNil ifTrue: [^ self].
	(aValue isKindOf: c) ifFalse: [^ self].
	cur := self slotAt: aBlock attr: '__code__'.
	(cur notNil and: [cur isKindOf: c]) ifFalse: [^ self].
	(cur ___codeKindBits___) == (aValue ___codeKindBits___) ifTrue: [^ self].
	warningsMod := (importlib @env1:modules) at: #warnings ifAbsent: [nil].
	warningsMod isNil ifTrue: [^ self].
	dep := self ___pyClassNamed___: #'DeprecationWarning'.
	dep isNil ifTrue: [^ self].
	warningsMod
		@env1:warn: 'Assigning a code object of non-matching type is deprecated (e.g., from a generator to a plain function)'
		_: dep.
	^ self
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
___checkCodeWrite___: aBlock value: aValue
	"``f.__code__ = g.__code__'' is refused when the two describe DIFFERENT
	NUMBERS OF FREE VARIABLES -- CPython raises

	    ValueError: b() requires a code object with 0 free vars, not 1

	and it is not a formality.  A function's cells and its code have to agree
	about how many free variables there are; installing code that expects a
	different number leaves the two describing different closures, and the
	damage shows up at the next call rather than at the assignment.

	The count comes from co_freevars, which FunctionDefAst stamps from the same
	free-variable set it builds __closure__ from -- so the check cannot disagree
	with the cells it protects.

	Silent when either side is not a code object: the TYPE check in
	___checkFunctionWrite___: owns that error, and reporting it twice with two
	different exceptions would be worse than reporting it once."

	"``fnName'' rather than ``name'': a class-side method already has ``name'' in
	scope (Behavior's), and redeclaring it is CompileError 1030."
	| c cur fnName |
	c := self ___pyClassNamed___: #'PyCode'.
	c isNil ifTrue: [^ self].
	(aValue isKindOf: c) ifFalse: [^ self].
	cur := self slotAt: aBlock attr: '__code__'.
	(cur notNil and: [cur isKindOf: c]) ifFalse: [^ self].
	(cur ___freevarCount___) == (aValue ___freevarCount___) ifTrue: [^ self].
	fnName := self slotAt: aBlock attr: '__name__'.
	^ (System myUserProfile symbolList objectNamed: #'ValueError')
		@env1:___signal___: ((fnName isNil ifTrue: ['function'] ifFalse: [fnName asString])
			, '() requires a code object with '
			, cur ___freevarCount___ printString
			, ' free vars, not '
			, aValue ___freevarCount___ printString)
%

category: 'Grail-Access'
classmethod: ExecBlockAttrs
slotAt: aBlock attr: aName put: aValue
	"Write ``aBlock'''s slot ``aName'' PER OBJECT -- the runtime path.  The
	def-time stamps use staticSlotAt:attr:put: instead, so they do not create
	a per-object entry for every function ever evaluated.

	Guarded, and only HERE rather than in staticSlotAt:attr:put:, which is the
	point: the def-time stamps write values the compiler produced and must not be
	type-checked against Python's rules, while this is the runtime
	``f.__name__ = ...'' path CPython guards."

	self ___checkFunctionWrite___: aName value: aValue.
	"After the type check, not before: a non-code value is a TypeError about its
	type, not a ValueError about its free variables."
	(aName asString = '__code__') ifTrue: [
		self ___checkCodeWrite___: aBlock value: aValue.
		"After the free-variable REFUSAL: a write that is about to raise should
		not also warn about the kind it was never going to install."
		self ___warnCodeKindMismatch___: aBlock value: aValue].
	(self slotsFor: aBlock) at: aName asString put: aValue.
	^ aValue
%

set compile_env: 0
