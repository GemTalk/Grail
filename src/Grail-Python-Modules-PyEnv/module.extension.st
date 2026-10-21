Extension { #name : 'module' }

{ #category : 'Grail-Singleton' }
module class >> ___importlibOrNil___ [
	"importlib, or nil when this user's Python dictionary has none.  Resolved
	late: this file compiles before importlib exists, possibly as a different
	user."

	| pyDict |
	pyDict := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'Python'.
	pyDict == nil ifTrue: [^ nil].
	^ pyDict @env0:at: #'importlib' otherwise: nil

]

{ #category : 'Grail-Singleton' }
module class >> ___initializesOnFirstTouch___ [
	"Does an instance that ``instance'' mints run initialize?  When the class
	HAS one (a Python module's compiled body, a Smalltalk module's
	'Grail-Initialization' hook), unless it is another session's script
	(___isAnotherSessionsScript___).  Under GRAIL_ATTR_ACCESSORS +
	GRAIL_DIRECT_CALLS a bare unary send a module does not implement is a
	Python CALL, so initialize is never sent to a class without one."

	^ (self @env0:whichClassIncludesSelector: #initialize environmentId: 1) @env0:notNil
		and: [self ___isAnotherSessionsScript___ @env0:not]

]

{ #category : 'Grail-Singleton' }
module class >> ___isAnotherSessionsScript___ [
	"Is this the module class of a script that ANOTHER session ran as __main__?

	A script's __main__ is session-local (importlib ___isSessionLocalModule___:):
	its class is filed in that session's own dictionary, never in PythonModules,
	and its instance is never committed.  The class still is, with any class the
	script defines whose instance the script commits, because that class's
	methods read their globals through it.  So calling such a method from
	another session minted a fresh __main__ and ran the WHOLE script in the
	caller: a breakpoint() in it hung the call, its gemdb.commit() committed
	the caller's work, and its class statements, re-run outside the script's
	own session, left the class's methods broken, committed by that same
	commit (#1662).  CPython never runs a module to call a method, so the
	globals stay unbound instead: builtins and the script's own functions
	still resolve, and a name only its body bound raises NameError.

	By name: a script is always __main__, and only a script is meant here.
	Every other module keeps the old first touch, the session-local ones
	included (a fresh import, ___isSessionLocalModule___:)."

	| implib |
	self @env0:name == #'__main__' ifFalse: [^ false].
	self @env0:isCommitted ifFalse: [^ false].
	((self @env0:categoryOfSelector: #initialize environmentId: 1) @env0:= #'Grail-Module Body')
		ifFalse: [^ false].
	implib := self ___importlibOrNil___.
	implib == nil ifTrue: [^ false].
	^ (implib @env0:___grailFiledModuleClass___: self under: self @env0:name) @env0:not

]

{ #category : 'Grail-Initialization' }
module class >> __new__ [
	"``types.ModuleType()'' with no arguments -- a TypeError in CPython,
	which requires the name.  The zero-argument call does NOT reach
	_new:kw:; the generic class-call dispatches it straight to this
	selector, so it has to be refused here or it falls through to object's
	allocator and yields a nameless module."

	^ TypeError ___signal___:
		'module() missing required argument ''name'' (pos 1)'

]

{ #category : 'Grail-Initialization' }
module class >> __new__: aName [
	"CPython's ``types.ModuleType(name)'' -- allocate a fresh, empty module.

	``module'' otherwise inherits KeyValueDictionary's class-side
	``__new__:'', which reads its argument as an iterable of (key, value)
	PAIRS.  A module's argument is its NAME, so that raised ValueError
	(``dictionary update sequence element #0 has length 1; 2 is required'')
	before __init__: ever ran.

	This sets the name itself rather than leaving it to __init__:.  Grail's
	class-call dispatch names selectors BY ARITY -- ``module('x')'' resolves
	straight to ``__new__:'' and no separate __init__ send follows -- which
	is the same shape dict's ``__new__: source'' already has.  (__init__: is
	still defined, for a Python subclass reaching the base through
	``super().__init__(name)''.)

	Deliberately ``new'' and not the singleton ``instance'': a module built
	here is a plain namespace object and must NOT be registered as its
	class's singleton, or types.ModuleType('x') would hand out -- and
	overwrite -- the shared instance every other importer sees."

	| inst |
	inst := self @env0:new.
	inst ___initName___: aName doc: None.
	^ inst

]

{ #category : 'Grail-Initialization' }
module class >> __new__: aName _: aDoc [
	"Two-argument form: ``types.ModuleType(name, doc)''."

	| inst |
	inst := self @env0:new.
	inst ___initName___: aName doc: aDoc.
	^ inst

]

{ #category : 'Grail-Initialization' }
module class >> _new: positional kw: keywords [
	"The class-call varargs entry, used whenever KEYWORDS are present --
	``types.ModuleType(name='x')''.  A fourth distinct route into building
	a module, alongside class-side __new__:/__new__:_: (positional, chosen
	by arity) and instance-side ___initFrom___:kw: (a subclass with no
	__init__ of its own).  Each one had to be covered separately; missing
	this one turned ``ModuleType(name='x')'' into an ArgumentTypeError from
	SymbolAssociation, because dict's version stores the keywords AS
	ENTRIES and a SymbolDictionary demands Symbol keys.

	CPython's signature is ``module(name, doc=None)'', verified against
	3.14 -- see the notes on ___initFrom___:kw:, which enforces the same
	contract on the instance side."

	"NOT ``name'' for the temp: this is a CLASSMETHOD, so self is the class
	 and GemStone's Class instVar ``name'' is already in scope -- CompileError
	 1030, ``variable has already been declared''."
	| inst modName doc |
	(positional @env0:size @env0:> 2) ifTrue: [
		^ TypeError ___signal___: ('module() takes at most 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	modName := positional @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [positional @env0:at: 1].
	doc := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [None].
	keywords @env0:ifNotNil: [
		keywords @env0:keysAndValuesDo: [:k :v |
			(k @env0:asString @env0:= 'name') ifTrue: [modName := v].
			(k @env0:asString @env0:= 'doc') ifTrue: [doc := v]]].
	modName == nil ifTrue: [
		^ TypeError ___signal___:
			'module() missing required argument ''name'' (pos 1)'].
	inst := self @env0:new.
	inst ___initName___: modName doc: doc.
	^ inst

]

{ #category : 'Grail-Singleton' }
module class >> clearInstance [
	"Clear the singleton instance (useful for testing)."
	self @env0:___sessionInstances___ @env0:removeKey: self ifAbsent: []

]

{ #category : 'Grail-Singleton' }
module class >> instance [
	"Return the singleton instance of this module subclass, creating it
	on first access.  SESSION-LOCAL (SessionTemps) -- see
	___sessionInstances___.  Initialization runs in env 1 so subclasses
	can install Python-side state."

	| reg inst |
	reg := self @env0:___sessionInstances___.
	inst := reg @env0:at: self otherwise: nil.
	inst == nil ifTrue: [
		"Canonical modules (docs/Persistent_Modules_and_Classes.md
		par.10.4): committed code resolves dependency module globals
		through THIS lazy path without any import having run in the
		session.  Consult the committed canonical registry before
		minting -- a fresh mint re-runs the module body and re-mints
		its singletons, breaking identity checks against committed
		state.  importlib is resolved late (this file compiles before
		importlib exists, possibly as a different user), and the helper
		answers nil unless the canonical flag is on and a committed
		instance applies -- so the default path is untouched."
		| implib |
		implib := self ___importlibOrNil___.
		implib == nil ifFalse: [
			inst := implib @env0:___canonicalInstanceForModuleClass___: self.
			"The helper already adopted inst as this class's session
			singleton (before running its __session_init__), so just
			answer it."
			inst == nil ifFalse: [^ inst]]].
	inst == nil ifTrue: [
		inst := self @env0:new.
		reg @env0:at: self put: inst.
		"See ___initializesOnFirstTouch___: not every minted module runs one."
		self ___initializesOnFirstTouch___ ifTrue: [inst initialize]
	].
	^ inst

]

{ #category : 'Grail-Singleton' }
module class >> new [
	"Modules are singletons; use `instance` instead of `new`."
	TypeError ___signal___:
		('Use #''instance'' instead of #''new'' for '
			@env0:, (self @env0:name @env0:asString @env0:, ' module'))

]

{ #category : 'Grail-Attribute Access' }
module >> ___clearWrappedGlobal___: aSym [
	"Drop the cached BoundMethod a lazy wrap left in the dynamic slot, so a
	delete is not undone by the wrap the last read stored there."

	(self @env0:dynamicInstVarAt: aSym) @env0:isNil ifFalse: [
		self @env0:removeDynamicInstVar: aSym]

]

{ #category : 'Grail-Attribute Access' }
module >> ___deletedGlobals___ [
	"The names ``del m.x'' has removed from this module although a class
	METHOD still answers them -- a set, or nil when nothing was deleted.

	Held in SessionTemps, keyed by module identity, because a Grail module is
	a PERSISTENT object: unfiling the method or recording the deletion on the
	module itself would outlive the program that did it, while CPython's del
	touches one process's module and nothing else."

	| reg |
	reg := SessionTemps @env0:current @env0:at: #'GrailDeletedGlobals' otherwise: nil.
	reg @env0:isNil ifTrue: [^ nil].
	^ reg @env0:at: self otherwise: nil

]

{ #category : 'Grail-Attribute Access' }
module >> ___functionHandleFor___: aSym [
	"The BoundMethod an attribute read of the module function aSym answers --
	the ONE place both resolution chains (object >> ___pyAttrLoad___: for
	``m.f'', ___globalAt___:otherwise: for a bare-name read) mint it.  Cached
	in the slot, so it has the stable identity CPython gives module functions,
	only when that store writes nothing committed; otherwise BoundMethod's
	per-session intern is the answer (___mayCacheFunctionHandles___)."

	| fn |
	fn := BoundMethod receiver: self selector: aSym.
	self ___mayCacheFunctionHandles___
		ifTrue: [self @env0:dynamicInstVarAt: aSym put: fn].
	^ fn

]

{ #category : 'Grail-Attribute Access' }
module >> ___globalAt___: aSym otherwise: aBlock [
	"Resolve a module-global binding; evaluate aBlock when absent.  The
	single resolution chain behind bare-name reads (___moduleAttrLoad___:,
	which raises NameError) and the globals() live view (PyModuleDict,
	which raises KeyError / returns a default).  Probes dynamic-instVar
	storage first (canonical home for user globals and rebound names); if
	absent, lazy-wraps a class method as a BoundMethod (handles top-level
	defs without pre-storing a handle at def time, which would block
	rebinding detection in CallAst's bare-call dispatch); finally falls
	back to the legacy SymbolDictionary slot (built-in module data
	attributes)."

	| val s sym1 sym2 sym3 symVA cls owner |
	"A DELETED name stays deleted, even when a METHOD would answer it.  A
	module keeps its globals in three places -- dynamic instVars, dictionary
	entries and lazily-wrapped class methods -- and only the first two can be
	removed.  ``del sys.stdout'' therefore answered None and left stdout
	exactly where it was, because sys is written in Smalltalk and its stdout
	is a method; the caller was told the delete worked.  A tombstone is the
	only way a method-backed name can be made absent without unfiling a method
	every session shares."
	val := self @env0:dynamicInstVarAt: aSym.
	val == nil ifFalse: [^ val].
	"A DELETED name stays deleted, even when a METHOD would answer it.  A
	module keeps its globals in three places -- dynamic instVars, dictionary
	entries and lazily-wrapped class methods -- and only the first two can be
	removed.  ``del sys.stdout'' therefore answered None and left stdout
	exactly where it was, because sys is written in Smalltalk and its stdout
	is a method; the caller was told the delete worked.  A tombstone is the
	only way a method-backed name can be made absent without unfiling a method
	every session shares.

	CHECKED AFTER the dynamic-instVar probe, not before, and that ordering is
	what makes a later assignment revive the name: ``m.x = v'' stores a
	dynamic instVar, which is found above and never reaches the tombstone.  No
	store hook is needed, and none can be forgotten."
	(self ___isDeletedGlobal___: aSym) ifTrue: [^ aBlock @env0:value].
	cls := self @env0:class.
	s := aSym @env0:asString.
	"Value-attribute accessors (the ``__name__'' / ``__doc__'' / …
	dunders — getter+setter pairs) must be PERFORMED to yield their
	value BEFORE the fixed-arity probes below.  Otherwise the ``sym1''
	(``<name>:'') probe matches the paired SETTER and wraps it as a
	BoundMethod, shadowing the real value — so a bare module-scope
	``__name__'' read returned a BoundMethod instead of the module's
	name string.  Discriminate by category: ``Grail-Accessors'' is a
	value attribute; top-level Python defs live in ``Grail-Methods''
	and are still wrapped (as first-class functions) by the unary
	branch further down."
	owner := cls @env0:whichClassIncludesSelector: aSym environmentId: 1.
	(owner notNil
		and: [(owner @env0:categoryOfSelector: aSym environmentId: 1) == #'Grail-Accessors'])
			ifTrue: [^ self @env0:perform: aSym env: 1].
	"Lazy-wrap a top-level def as BoundMethod.  The def itself
	compiled as a real env-1 method on the module class; this is
	the first read that turns it into a first-class function value."
	symVA := ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol.
	"Module functions are first-class attributes with STABLE identity in
	CPython (g.dispatch(int) is g_int), and callers may compare with
	``is'' -- but caching the handle in the slot must not WRITE A COMMITTED
	MODULE (issue #851).  See ___functionHandleFor___: and
	___mayCacheFunctionHandles___."
	((cls @env0:whichClassIncludesSelector: symVA environmentId: 1) notNil) ifTrue: [
		^ self ___functionHandleFor___: aSym
	].
	"Try the fast-path fixed-arity selectors first (1..3 args), then
	walk to higher arities until we either find one or exhaust the
	candidate range.  Without the > 3 check, a top-level def with
	four or more simple-positional params (e.g. flask.cli's
	``def run_command(info, host, port, reload, debugger, ...)'' —
	9 args) wasn't picked up, leaving the module read to fall
	through to the NameError branch even though the method exists.
	Cap at 16 args — beyond that we'd hit the varargs form anyway."
	sym1 := (s @env0:, ':') @env0:asSymbol.
	sym2 := (s @env0:, ':_:') @env0:asSymbol.
	sym3 := (s @env0:, ':_:_:') @env0:asSymbol.
	(((cls @env0:whichClassIncludesSelector: sym1 environmentId: 1) notNil)
		or: [(cls @env0:whichClassIncludesSelector: sym2 environmentId: 1) notNil
		or: [(cls @env0:whichClassIncludesSelector: sym3 environmentId: 1) notNil]]) ifTrue: [
		^ self ___functionHandleFor___: aSym
	].
	"Higher-arity fixed selectors (4..16 args).  Selector shape is
	``name:'' followed by ``_:'' repeated (arity - 1) times."
	4 to: 16 do: [:arity |
		| candidate |
		candidate := s @env0:asString @env0:, ':'.
		2 to: arity do: [:_ | candidate := candidate @env0:, '_:'].
		(cls @env0:whichClassIncludesSelector: candidate @env0:asSymbol environmentId: 1) notNil ifTrue: [
			^ self ___functionHandleFor___: aSym
		].
	].
	"Unary class method.  Two sub-cases:
	  * Defined on the ``module'' superclass — a dunder accessor like
	    ``__name__'' that reads from the SymbolDictionary slot.  Perform
	    directly to return the stored value.
	  * Defined on a subclass — a 0-arg top-level def (Python
	    ``def foo(): ...'' compiles to a unary Smalltalk selector).
	    Wrap as BoundMethod so the bare name is a first-class function
	    reference, NOT an auto-invocation.  Without this branch a
	    generator-function reference like ``func = _my_cm_impl''
	    would auto-call the generator and lose the function handle."
	owner := cls @env0:whichClassIncludesSelector: aSym environmentId: 1.
	owner notNil ifTrue: [
		owner == module
			ifTrue: [^ self @env0:perform: aSym env: 1]
			ifFalse: [^ BoundMethod receiver: self selector: aSym]
	].
	"Legacy SymbolDictionary fallback for built-in modules that
	store some attrs in the dict slot."
	(self @env0:includesKey: aSym) ifTrue: [^ self @env0:at: aSym].
	"``__builtins__'' -- the builtins namespace every module resolves free
	names against.  CPython's import machinery writes it into each module's
	globals, so a bare ``__builtins__'' resolves and ``mod.__dict__
	['__builtins__']'' reads; for an imported (non-__main__) module the value
	is the builtins module's DICT, not the module (test_funcattrs
	test___builtins__ picks between the two on __name__).

	A FALLBACK, NOT THE PRIMARY MECHANISM.  importlib class >>
	___stampBuiltinsOn___: writes the name into each module's namespace at
	registration, so it is normally a real entry and dir()/vars()/iteration see
	it as in CPython.  This branch covers what the stamp cannot reach: the
	bootstrap modules that register BEFORE the builtins module exists (a
	one-time sweep catches those up, but this makes the read correct even
	before it runs) and the launcher's own script module, which is created
	outside the import machinery.  Answering here means a read never depends on
	the stamp having run.  The cost is one memoised PyModuleDict lookup on a
	miss, and a miss is already the expensive path.

	LAST, after every other branch, so it is only a FALLBACK: a module that
	binds ``__builtins__'' itself -- which is how a sandbox restricts one --
	stores a dynamic instVar, and that is found at the top of this method and
	wins.  Here the name is unbound, and the answer is the real namespace."
	aSym == #'__builtins__' ifTrue: [
		| view |
		view := (Python @env0:at: #'PyModuleDict')
			@env0:___forModuleNamed___: 'builtins'.
		view isNil ifFalse: [^ view]].
	^ aBlock @env0:value

]

{ #category : 'Grail-Attribute Access' }
module >> ___globalNames___ [
	"Ordered key list for the module's global namespace (the globals()
	live view -- PyModuleDict).  Union of the three stores the
	___globalAt___:otherwise: chain reads, deduplicated, as Strings:
	  1. legacy SymbolDictionary slot entries (built-in module data
	     attributes, __doc__),
	  2. dynamic instVars in declaration order (user globals -- the
	     insertion-ordered common case),
	  3. the module class's OWN top-level defs ('Grail-Methods'
	     category) not yet lazily wrapped into a dynamic slot, so
	     ``'myfunc' in globals()'' is true before the first bare read.
	Internal ``___...___'' selectors are excluded."

	| names seen add |
	names := OrderedCollection @env0:new.
	seen := Set @env0:new.
	add := [:nm |
		(seen @env0:includes: nm) ifFalse: [
			seen @env0:add: nm.
			names @env0:add: nm]].
	self @env0:keysDo: [:k | add @env0:value: k @env0:asString].
	(self @env0:dynamicInstanceVariables) @env0:do: [:k | add @env0:value: k @env0:asString].
	"Only a module's OWN generated class holds its top-level defs.  A bare
	``types.ModuleType(name)'' is an instance of ``module'' itself, and a
	ModuleType subclass a program defined holds that class's METHODS -- in
	neither case are they namespace entries (CPython: vars(ModuleType('m')) is
	__name__, __doc__, __package__, __loader__, __spec__), and listing them
	put ``update'', ``__repr__'' and the rest into runpy's run_path globals."
	self ___grailHasNoOwnDefs___ ifTrue: [^ names].
	(self @env0:class @env0:selectorsForEnvironment: 1) @env0:do: [:sel |
		| s index skip |
		s := sel @env0:asString.
		"THE SAME CATEGORY RULE AS __dir__, which EXCLUDES the two artifact
		categories rather than REQUIRING 'Grail-Methods'.

		Requiring it was too narrow by exactly the modules written in
		Smalltalk: sys's functions (exit, exc_info, _getframe, ...) are
		hand-written in a .gs file under their own categories, so they were
		reported by dir(sys) and by getattr, and NOT by vars(sys) /
		sys.__dict__ / globals().  CPython's invariant is that those agree --
		test_builtin test_vars asserts ``set(vars(sys)) == set(dir(sys))'' --
		and 32 of sys's 82 names were missing from one side.

		Worse than missing: PyModuleDict's __contains__ answers from the
		attribute chain rather than from this list, so ``'exit' in vars(sys)''
		was TRUE while ``'exit' in set(vars(sys))'' was False.  A membership
		test and an enumeration of the same mapping disagreed.

		Nothing changes for a module written in PYTHON: its top-level defs all
		compile into 'Grail-Methods', which neither rule excludes."
		skip := (self ___isGrailInternalSelector___: s)
			@env0:or: [(self ___isDeletedGlobal___: sel)
			@env0:or: [self ___isAbsentAccessor___: sel]].
		skip ifFalse: [
			| cat |
			cat := self @env0:class @env0:categoryOfSelector: sel environmentId: 1.
			skip := (cat @env0:= #'Grail-Module Body')
				@env0:or: [cat @env0:= #'Grail-Initialization'].
			"A module written in Smalltalk that implements dir() for itself
			(builtins does) has a ``__dir__'' method, and that is protocol, not
			a global: CPython's builtins.__dict__ has no such key.  A Python
			module's own ``def __dir__()'' compiles into 'Grail-Methods' and
			stays."
			(sel == #'__dir__' and: [cat @env0:~= #'Grail-Methods'])
				ifTrue: [skip := true]].
		skip ifFalse: [
			index := s @env0:indexOf: $:.
			(index == 0) ifFalse: [s := s @env0:copyFrom: 1 to: (index @env0:- 1)].
			"A varargs def / forwarder compiles to ``_<name>:kw:''; its base
			carries a leading underscore that is NOT part of the Python name
			(``abs'' -> forwarder ``_abs:kw:'').  Strip one leading underscore
			for :kw: selectors so globals()/__dict__ reads the real name and not
			a stray ``_abs'' (test_operator's test___all__).  A genuine ``_foo''
			def forwards as ``__foo:kw:'' -> base ``__foo'' -> ``_foo'', so the
			real name is preserved."
			((sel @env0:asString @env0:endsWith: ':kw:')
				and: [(s @env0:size @env0:> 1) and: [(s @env0:at: 1) @env0:== $_]])
				ifTrue: [s := s @env0:copyFrom: 2 to: s @env0:size].
			add @env0:value: s]].
	^ names

]

{ #category : 'Grail-Python-Protocol' }
module >> ___grailHasNoOwnDefs___ [
	"True when this module's class holds no top-level defs of its own: a bare
	``types.ModuleType(name)'' (an instance of ``module'' itself), or an
	instance of a ModuleType subclass a program defined, whose methods are
	that class's, not namespace entries.  Such a module's namespace is only
	what was stored in it -- see ___globalNames___ and PyModuleDict >>
	___moduleValueAt___:ifAbsent:, which must agree."

	^ (self @env0:class == module)
		or: [self @env0:class @env0:includesSelector: #'___pyDefinedClass___' environmentId: 1]

]

{ #category : 'Grail-Attribute Access' }
module >> ___grailShadowedSuper___ [
	"The module attribute ``super'' if this module has one, else nil -- the
	RUNTIME half of ``does the program bind the name super''.

	CPython does not treat ``super()'' as a syntactic form: the compiler emits
	an ordinary LOAD of the name, so whatever the module currently binds wins.
	Grail rewrites ``super()'' at codegen time, so it needs to ask.  The
	question is split in two, by WHEN the binding can be seen:

	  * STATICALLY, from a ``class super:'' or ``super = ...'' in the module
	    body -- CallAst >> ___superNameIsShadowed___, which suppresses the
	    rewrite entirely and costs nothing at run time.
	  * At RUN TIME, from a name set on the module after it was compiled
	    (``unittest.mock.patch(f'{__name__}.super', MySuper)'', which is
	    test_super's test_shadowed_dynamic and test_shadowed_dynamic_two_arg).
	    That is this method.

	Deliberately ONLY the dynamic-instVar slot, not the full
	___globalAt___:otherwise: chain.  A runtime setattr on a module lands in
	that slot and nowhere else, so one probe is the whole answer -- whereas the
	full chain's MISS path (accessor-category test, several
	whichClassIncludesSelector: probes, the legacy SymbolDictionary) is the
	expensive one, and a miss is the case EVERY ordinary super() call in the
	corpus takes.  Anything the full chain would find that this does not is
	static by construction, and therefore already the static half's job."

	^ self @env0:dynamicInstVarAt: #'super'

]

{ #category : 'Grail-Attribute Access' }
module >> ___hasMethodBackedGlobal___: aSym [
	"Whether a class METHOD would answer aSym -- the third home, the one no
	store can remove."

	| cls s |
	cls := self @env0:class.
	s := aSym @env0:asString.
	(cls @env0:whichClassIncludesSelector: aSym environmentId: 1) @env0:notNil
		ifTrue: [^ true].
	((cls @env0:whichClassIncludesSelector: ('_' @env0:, s @env0:, ':kw:') @env0:asSymbol
		environmentId: 1) @env0:notNil) ifTrue: [^ true].
	^ (cls @env0:whichClassIncludesSelector: (s @env0:, ':') @env0:asSymbol
		environmentId: 1) @env0:notNil

]

{ #category : 'Grail-Initialization' }
module >> ___initFrom___: positional kw: keywords [
	"In-place init from positional + keyword args -- the route Grail uses for
	a subclass that does NOT override __init__.  six's
	``Module_six_moves_urllib'' is exactly that shape, and without this it
	inherited dict's ___initFrom___:kw:, which reads positional[1] as a
	MAPPING and so read the module's NAME as a sequence of (key, value)
	pairs.

	CPython's signature is ``module(name, doc=None)'', verified against
	3.14: both arguments may be passed by keyword, three positionals raise
	``module() takes at most 2 arguments (3 given)'', and no name at all
	raises ``module() missing required argument 'name' (pos 1)''."

	| name doc |
	(positional @env0:size @env0:> 2) ifTrue: [
		^ TypeError ___signal___: ('module() takes at most 2 arguments ('
			@env0:, positional @env0:size @env0:printString @env0:, ' given)')].
	name := positional @env0:isEmpty
		ifTrue: [nil]
		ifFalse: [positional @env0:at: 1].
	doc := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [None].
	keywords @env0:ifNotNil: [
		keywords @env0:keysAndValuesDo: [:k :v |
			(k @env0:asString @env0:= 'name') ifTrue: [name := v].
			(k @env0:asString @env0:= 'doc') ifTrue: [doc := v]]].
	name == nil ifTrue: [
		^ TypeError ___signal___:
			'module() missing required argument ''name'' (pos 1)'].
	self ___initName___: name doc: doc.
	^ self

]

{ #category : 'Grail-Initialization' }
module >> ___initName___: aName doc: aDoc [
	"What CPython's module.__init__ sets on a module made by
	``types.ModuleType(name, doc=None)'': __name__ and __doc__, and
	__package__, __loader__ and __spec__ as None -- the five entries of
	vars(ModuleType('m')).  The last three were missing, and runpy reads them
	back off the namespace it builds that way.  One helper for every creation
	route (class-side __new__:, __new__:_:, _new:kw:; instance-side __init__:,
	__init__:_:, ___initFrom___:kw:)."

	self @env0:at: #__name__ put: aName.
	self @env0:at: #__doc__ put: aDoc.
	self @env0:at: #__package__ put: None.
	self @env0:at: #__loader__ put: None.
	self @env0:at: #__spec__ put: None

]

{ #category : 'Grail-Attribute Access' }
module >> ___isAbsentAccessor___: aSym [
	"Whether aSym is an accessor that DELIBERATELY reports no such attribute.

	``__cached__'' is implemented as a method that signals AttributeError --
	in CPython it is the path of the module's compiled BYTECODE FILE, Grail
	has no such file, and inventing one would be a wrong answer wearing a
	familiar name (ModuleCachedAbsentTestCase).  Being a method, it appears in
	``class selectorsForEnvironment: 1'', so the __dir__ and ___globalNames___
	sweeps reported a name that getattr refuses: dir() listed it, ``in'' said
	true, and reading it raised.  PyModuleDict >> ___moduleKeys___ unions
	__dir__ into its key list and keysAndValuesDo: READS each key, so the
	whole namespace view became untraversable -- ``dict(m.__dict__)'' and
	``exec(src, m.__dict__)'' both died on an otherwise healthy module.

	Only a module whose class is ``module'' itself showed it.  One loaded from
	a path gets a generated class whose env-1 selectors are its own globals,
	which is why this hid until a bare types.ModuleType was built.

	A NAMESPACE ENTRY STILL WINS, exactly as in the accessor: a module body may
	assign ``__cached__ = ...'' itself and CPython reads that back, so this is
	a default and not a veto.  Mirrors module >> __cached__ deliberately; the
	two must agree or the same disagreement returns."

	aSym @env0:== #'__cached__' ifFalse: [^ false].
	^ (self @env0:includesKey: #'__cached__') @env0:not

]

{ #category : 'Grail-Attribute Access' }
module >> ___isBuiltinsModule___ [
	"Whether this module is ``builtins'' -- the one module whose namespace
	___builtinNamespaceNames___ describes."

	^ [self @env0:== ((Python @env0:at: #builtins) @env1:instance)]
		@env0:on: AbstractException do: [:ex | ex @env0:return: false]

]

{ #category : 'Grail-Attribute Access' }
module >> ___isDeletedGlobal___: aSym [
	"Whether aSym has been deleted from this module.  Read on EVERY global
	resolution, so it answers nil-fast when nothing was ever deleted."

	| set |
	set := self ___deletedGlobals___.
	set @env0:isNil ifTrue: [^ false].
	^ set @env0:includes: aSym

]

{ #category : 'Grail-Attribute Access' }
module >> ___isGrailInternalSelector___: aSelectorString [
	"Whether a selector is Grail MACHINERY rather than a Python name, for the
	two enumerations -- __dir__ and ___globalNames___ -- that must agree.

	Three leading underscores was the whole test, and it is one underscore too
	greedy.  Grail's internal names are ``___name___'': three leading AND
	three trailing.  A varargs Python builtin compiles to ``_<name>:kw:'', so
	a Python DUNDER builtin becomes ``___import__:kw:'' /
	``___build_class__:kw:'' -- three leading and only TWO trailing, which the
	old test could not tell apart from machinery.

	Both were therefore missing from builtins.__dict__ while dir(builtins)
	listed them, because dir() for that module answers the curated
	___builtinNamespaceNames___ spec instead.  The cost is not cosmetic: an
	exec() handed a COPY of builtins as its ``__builtins__'' got a copy with
	no __build_class__ and no __import__ in it, so class definitions and
	imports were forbidden in code CPython runs fine.

	Requiring the trailing ``___'' separates the two cleanly:
	___pyAttrLoad___: is machinery, ___import__:kw: is __import__."

	| base i |
	(aSelectorString @env0:size @env0:>= 3) ifFalse: [^ false].
	(aSelectorString @env0:copyFrom: 1 to: 3) @env0:= '___' ifFalse: [^ false].
	base := aSelectorString.
	i := base @env0:indexOf: $:.
	i @env0:== 0 ifFalse: [base := base @env0:copyFrom: 1 to: i @env0:- 1].
	"A base ending in exactly two underscores, with three at the front, is a
	Python dunder that picked up the varargs prefix -- not machinery."
	(base @env0:size @env0:>= 5) ifTrue: [
		| endsTwo endsThree pyName |
		endsTwo := (base @env0:copyFrom: base @env0:size @env0:- 1 to: base @env0:size) @env0:= '__'.
		endsThree := (base @env0:copyFrom: base @env0:size @env0:- 2 to: base @env0:size) @env0:= '___'.
		(endsTwo @env0:and: [endsThree @env0:not]) ifTrue: [
			"IT STILL HAS TO BE A NAME PYTHON HAS.  The shape alone is not
			enough: ``___reload__:kw:'' is Grail's own helper behind
			importlib.reload, spelled like a dunder and belonging to no Python
			namespace, and admitting it put ``__reload__'' into
			dir(builtins).  ___builtinNamespaceNames___ is the spec of what
			CPython's builtins hold, so it is the thing to ask -- and asking
			it means a future Grail-private dunder needs no maintenance here.

			Only for the BUILTINS module: that spec says nothing about any
			other module's namespace, so elsewhere the shape stands on its
			own."
			pyName := base @env0:copyFrom: 2 to: base @env0:size.
			self ___isBuiltinsModule___ ifFalse: [^ false].
			^ (((Python @env0:at: #builtins) @env0:___builtinNamespaceNames___)
					@env0:includes: pyName @env0:asSymbol) @env0:not]].
	^ true

]

{ #category : 'Grail-Attribute Access' }
module >> ___markGlobalDeleted___: aSym [
	"Record that aSym is gone, and make a later assignment revive it: a store
	goes to a dynamic instVar, which the read probes BEFORE the tombstone
	would matter, so ___pyAttrStore___ clears the mark rather than leaving a
	name that can be written and not read."

	| reg set |
	reg := SessionTemps @env0:current @env0:at: #'GrailDeletedGlobals' otherwise: nil.
	reg @env0:isNil ifTrue: [
		reg := IdentityKeyValueDictionary @env0:new.
		SessionTemps @env0:current @env0:at: #'GrailDeletedGlobals' put: reg].
	set := reg @env0:at: self otherwise: nil.
	set @env0:isNil ifTrue: [
		set := IdentitySet @env0:new.
		reg @env0:at: self put: set].
	set @env0:add: aSym

]

{ #category : 'Grail-Attribute Access' }
module >> ___mayCacheFunctionHandles___ [
	"May an attribute read of a module FUNCTION cache its BoundMethod in this
	module's dynamic-instVar slot?  Only when that store writes nothing
	committed (issue #851).

	The cache is what gives a function a STABLE identity that survives the
	session: ``__abs__ = abs'' in operator's body stores the handle a read of
	``abs'' answered, and ``operator.__abs__ is operator.abs'' holds in a later
	session only because that read cached the SAME handle in ``abs'' and both
	shipped in the deploy commit.  So a module still being BUILT -- not yet
	committed -- caches as it always has, and the handles become part of what
	its deploy commits.

	A COMMITTED module does not.  Its instance is shared by every session, so
	caching there made a function's first read a repository write: a pure call
	dirtied a clean session (gemdb.transaction() then refused), and two
	sessions making the same first call conflicted Write-Write on the module,
	wedging the loser's commits.  The read answers BoundMethod's per-session
	intern instead, which keeps ``m.f is m.f'' within the session.

	NativeModule overrides this: its slots already live in SessionTemps.

	Nor does a module whose stores are now session-local
	(___globalStoreIsSessionLocal___): the handle would go to this session's
	overlay, which every later read of the module would then have to search.
	The per-session intern serves just as well."

	"And not a module whose class holds no defs of its own -- a bare ModuleType,
	or a ModuleType subclass's instance.  What its reads find is the CLASS's
	method, not a namespace entry, and caching it put the method into
	vars(m), which CPython never shows (``m.hello(); 'hello' in vars(m)'')."
	^ self @env0:isCommitted @env0:not
		and: [self @env0:___globalStoreIsSessionLocal___ @env0:not
		and: [self ___grailHasNoOwnDefs___ not]]

]

{ #category : 'Grail-Attribute Access' }
module >> ___mayDispatchToSetter___: aSym [
	"A MODULE's ordinary attributes are NAMESPACE BINDINGS, never accessor
	pairs, so an assignment to one must STORE and never dispatch.

	object's rule reads (name, name:) as a getter/setter pair wherever both
	exist.  On a module that shape is an ARITY FAMILY far more often than an
	accessor: sys has ``exit'' and ``exit:'' because sys.exit() and
	sys.exit(code) are both legal, and the same holds for audit, excepthook
	and friends.  So

	    sys.exit = Mock()

	did not replace sys.exit -- it CALLED sys.exit(Mock()), terminating the
	program with the Mock as its exit status.  unittest.mock.patch('sys.exit')
	is exactly that assignment, which is how test_builtin's TestBreakpoint
	tests reported ``aMock'' as a Smalltalk error: the test process was being
	asked to exit.

	It is the same failure object>>___mayDispatchToSetter___ already carves
	``__new__'' out for, and for the same stated reason -- the pair shape lies
	when the one-argument form takes an argument rather than a value.

	DUNDERS KEEP THE OLD PATH.  ``__name__'', ``__doc__'' and the other
	value-attribute accessors are genuine getter/setter pairs that Grail's own
	module machinery reads back through the accessor, so narrowing this to
	non-dunder names fixes the arity families without moving where a module's
	identity is stored."

	| s |
	s := aSym @env0:asString.
	((s @env0:size @env0:> 4)
		@env0:and: [(s @env0:copyFrom: 1 to: 2) @env0:= '__'
		@env0:and: [(s @env0:copyFrom: s @env0:size @env0:- 1 to: s @env0:size) @env0:= '__']])
		ifTrue: [^ super ___mayDispatchToSetter___: aSym].
	^ false

]

{ #category : 'Python-Mutation Methods' }
module >> ___mergePublicAttrsFrom___: aModule [
	"Copy every public (non-underscore-prefixed) attribute from
	aModule's namespace into self.  Used by `from X import *`
	codegen to pick up dynamically-injected names that parse-time
	star-import expansion missed (e.g. names added by
	`globals().update(...)` via a helper like re._constants._makecodes).

	Phase A: the canonical store for module globals is
	dynamicInstVarPairs.  Walk that first.  Also walk the
	SymbolDictionary keys as a fallback for the legacy pre-Phase-A
	storage path (built-in modules that haven't migrated yet)."

	| pairs cls mdict seen all |
	"WITH AN __all__, EXACTLY ITS NAMES.  CPython's import-all binds X.__all__
	when X defines one and falls back to the public names only when it does
	not; this merge always took the fallback, so a star import brought across
	everything X itself had imported.  ``from pk.sub import *'' with
	``__all__ = ['pub']'' bound pub and also sub's Path and partial.  Harmless
	until a package re-exports several submodules that way: pydantic.v1's
	__init__ star-imports five, CPython's namespace there holds 219 names, and
	Grail's passed the 255 a module can hold, so ``import pydantic.v1'' died
	with an uncatchable ImproperOperation.

	The rule is builtins >> ___doitStarImport___:into:'s, minus its raise: a
	name __all__ lists but X lacks is skipped here, because the parse-time half
	of the import has already reported it."
	all := [aModule @env1:___pyAttrLoad___: #'__all__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	all @env0:isNil ifFalse: [
		| iter done |
		iter := [all __iter__] @env0:on: AbstractException do: [:ex | ex @env0:return: nil].
		iter @env0:isNil ifFalse: [
			done := false.
			[done] @env0:whileFalse: [
				| nm val |
				nm := [iter __next__] @env0:on: StopIteration do: [:ex |
					done := true. ex @env0:return: nil].
				done ifFalse: [
					val := [aModule @env1:___pyAttrLoad___: nm @env0:asString @env0:asSymbol]
						@env0:on: AttributeError do: [:ex | ex @env0:return: nil].
					val == nil ifFalse: [
						importlib @env0:___bind: val
							onParent: self as: nm @env0:asString @env0:asSymbol]]].
			^ self]].
	"Phase A canonical store — every module global a user-level
	source assigned via `name = value` or `globals().update({...})`
	lives here as a dynamic instVar."
	pairs := aModule @env0:dynamicInstVarPairs.
	1 to: pairs @env0:size by: 2 do: [:i |
		| nm val s |
		nm := pairs @env0:at: i.
		val := pairs @env0:at: i + 1.
		s := nm @env0:asString.
		(s @env0:size @env0:> 0
			and: [(s @env0:at: 1) @env0:~= $_]) ifTrue: [
			val == nil ifFalse: [
				importlib @env0:___bind: val onParent: self as: nm @env0:asSymbol
			]
		]
	].
	"Legacy SymbolDictionary fallback for built-in modules whose
	attributes still land in the dict slot (e.g. dunders, or
	pre-Phase-A leftovers)."
	aModule @env0:keysAndValuesDo: [:key :value |
		| s |
		s := key @env0:asString.
		(s @env0:size @env0:> 0
			and: [(s @env0:at: 1) @env0:~= $_]) ifTrue: [
			importlib @env0:___bind: value onParent: self as: key @env0:asSymbol
		]
	].
	"A NATIVE module implements its FUNCTIONS as methods on its module class,
	not as dict entries or dynamic instVars, so neither walk above sees them:
	``from _socket import *'' brought across the constants and the classes and
	silently omitted every function.  CPython's socket.py needs three of them
	by bare name -- getdefaulttimeout, gethostbyaddr, gethostname -- and died
	with ``name 'getdefaulttimeout' is not defined'' well after the import that
	should have supplied it.

	The Python attribute name is derived from the SELECTOR: everything before
	the first colon, or for the varargs form ``_name:kw:'' the part between the
	leading underscore and the trailing ``:kw:''.  Several arities collapse onto
	one name, hence ``seen''.

	Only the module class's OWN methods, never inherited ones: ``module''
	itself defines the attribute-access infrastructure, and republishing that
	would inject ___moduleAttrLoad___ and its neighbours into the importer's
	namespace."
	cls := aModule @env0:class.
	mdict := cls @env0:persistentMethodDictForEnv: 1.
	mdict @env0:isNil ifFalse: [
		seen := IdentitySet @env0:new.
		mdict @env0:keysDo: [:sel | | str nm idx |
			str := sel @env0:asString.
			nm := ((str @env0:size @env0:> 4)
					@env0:and: [(str @env0:copyFrom: str @env0:size @env0:- 3
						to: str @env0:size) @env0:= ':kw:'])
				ifTrue: [
					(str @env0:at: 1) @env0:= $_
						ifTrue: [str @env0:copyFrom: 2 to: str @env0:size @env0:- 4]
						ifFalse: [nil]]
				ifFalse: [
					idx := str @env0:indexOf: $:.
					idx @env0:= 0
						ifTrue: [str]
						ifFalse: [str @env0:copyFrom: 1 to: idx @env0:- 1]].
			(nm @env0:notNil
				and: [nm @env0:size @env0:> 0
				and: [(nm @env0:at: 1) @env0:~= $_
				and: [(nm @env0:includesString: '___') @env0:not]]]) ifTrue: [
					(seen @env0:includes: nm @env0:asSymbol) ifFalse: [
						seen @env0:add: nm @env0:asSymbol.
						importlib @env0:___bind:
								(BoundMethod @env1:receiver: aModule selector: nm @env0:asSymbol)
							onParent: self as: nm @env0:asSymbol]]]]

]

{ #category : 'Grail-Attribute Access' }
module >> ___moduleAttrLoad___: aSym [
	"Bare-name module-attribute load with NameError on miss.  The full
	resolution chain lives in ___globalAt___:otherwise: (shared with the
	PyModuleDict live view that backs globals()); this entry point adds
	the NameError — matching ``KeyError → NameError'' in CPython's
	__globals__[name] lookup."

	"Raised through ___signalUndefined___: so the exception carries CPython's
	``name'' -- traceback.py needs it both for ``Did you mean'' and for the
	``Did you forget to import 'io'?'' hint it derives from
	sys.stdlib_module_names.  This is the bare-name miss for module globals,
	which is the undefined-name path Python code actually hits."
	"Through ___resolveBuiltinOrSignal___: so a name injected into builtins at
	run time (gettext.install()'s ``_'') resolves before the raise; on a miss
	it signals the identical NameError."
	^ self ___globalAt___: aSym otherwise: [
		NameError @env0:___resolveBuiltinOrSignal___: aSym @env0:asString]

]

{ #category : 'Grail-Attribute Access' }
module >> ___ownsFunction___: aSym family: aFamily [
	"Is aSym, which this module responds to under some spelling in aFamily, one of
	its own functions -- defined on its class or on module -- rather than the
	Smalltalk dictionary protocol SymbolDictionary and its superclasses carry, or
	a protocol refusal (__getitem__:)?

	The keyword twin of #1233's rule for a unary selector in ___pyAttrLoad___::
	``hasattr(json, 'get')'' answered KeyValueDictionary >> get:, and so did pop,
	update and setdefault.  A dunder is exempt, as it is there: the object
	protocol (__eq__:, __reduce_ex__:) legitimately lives above module."

	| walker |

	(self ___isProtocolFallback___: aSym) ifTrue: [^ false].
	(self ___grailIsDunderName___: aSym) ifTrue: [^ true].
	walker := self @env0:class.
	[walker == nil] whileFalse: [
		(self ___class___: walker owns: aSym family: aFamily) ifTrue: [^ true].
		walker == module ifTrue: [^ false].
		walker := walker @env0:superClass].
	^ false

]

{ #category : 'Grail-Attribute Access' }
module >> ___pyAttrDelete___: aName [
	"``del m.x'' removes the binding WHEREVER the module keeps it.

	A module is a SymbolDictionary subclass and its globals live in two
	places: dictionary entries (built-in module data set up at import, which
	is where sys puts breakpointhook, excepthook, displayhook and friends) and
	dynamic instVars (globals a Python module body assigns).  object's
	___pyAttrDelete___ knows only the second, so deleting one of the first
	SILENTLY did nothing -- ``del sys.breakpointhook'' answered None and the
	attribute was still there on the next read.

	That is the worst shape a delete can have: the caller is told it worked.
	PEP 553 makes it load-bearing -- breakpoint() is specified to raise
	RuntimeError once the hook has been deleted, and it cannot, because the
	hook was never gone (test_builtin TestBreakpoint
	test_runtime_error_when_hook_is_lost).

	Both stores are tried before giving up, because a name can legitimately be
	in either: a module body that assigns over a built-in name creates a
	dynamic instVar shadowing the dictionary entry, and deleting it must clear
	both or the read falls back to the value the program replaced.  Falling
	through to super when neither has it keeps the AttributeError a missing
	name is supposed to raise."

	| sym removed |
	sym := aName @env0:asString @env0:asSymbol.
	removed := false.
	(self @env0:includesKey: sym) ifTrue: [
		self @env0:removeKey: sym.
		removed := true].
	((self @env0:dynamicInstVarAt: sym) @env0:== nil) ifFalse: [
		self @env0:removeDynamicInstVar: sym.
		removed := true].
	"A THIRD HOME: a lazily-wrapped class METHOD.  Neither store holds it and
	unfiling the method is not an option -- it is shared by every session and
	by every other module in the image -- so the name is TOMBSTONED instead,
	which is what makes ``del sys.stdout'' mean anything.

	Session-local, deliberately.  A module is a persistent object here, so
	removing a built-in attribute for good would outlive the program that did
	it; CPython's del touches one process's module object and nothing else."
	"UNCONDITIONALLY, not only when the stores had nothing.  Removing the
	dynamic instVar that shadowed a method does not delete the name -- it
	REVEALS the method underneath, so ``sys.stdout = f; del sys.stdout''
	quietly restored the original stdout and reported success."
	(self ___hasMethodBackedGlobal___: sym) ifTrue: [
		self ___markGlobalDeleted___: sym.
		removed := true].
	removed ifTrue: [
		self ___clearWrappedGlobal___: sym.
		^ None].
	"CPython's message for delattr, which is NOT its message for getattr: a
	failed READ says ``module 'sys' has no attribute 'x''' and a failed DELETE
	says ``'module' object has no attribute 'x'''.  object's version answers
	the bare name and nothing else, which is not a sentence."
	^ AttributeError ___signal___: '''module'' object has no attribute '''
		@env0:, aName @env0:asString @env0:, ''''

]

{ #category : 'Grail-Attribute Access' }
module >> ___pyAttrStore___: aName put: aValue [
	"``m.x = v'' on a module, which also REVIVES a name ``del m.x'' removed.

	The revival cannot be left to the read order, and that is the lesson
	here.  A module has three homes for a global -- dynamic instVars,
	dictionary entries and class methods -- and a store does not always pick
	the first: sys.stdout has a compiled ACCESSOR PAIR, so assigning it
	performs the setter and writes neither store.  A tombstone checked after
	the dynamic-instVar probe therefore still hid a name that had just been
	assigned, and ``sys.stdout = f'' after a delete kept raising.

	Clearing the mark HERE is independent of where the value lands, which is
	the only version of this that cannot be wrong."

	self ___unmarkGlobalDeleted___: aName @env0:asString @env0:asSymbol.
	^ super ___pyAttrStore___: aName put: aValue

]

{ #category : 'Grail-Python-Protocol' }
module >> ___pyMetaclass___ [
	"type(m) for a module: ``module'', the one type CPython gives every module.

	Each Grail module is an instance of its OWN generated class -- ``sys'',
	``os'', ``__main__'' -- and that class is an implementation detail, so it
	must not be what type() answers.  It was, and ``type(sys)(name)'' -- the
	idiom for a blank module, which runpy uses for run_path's namespace
	(``ModuleType = type(sys)'') -- made a module carrying every member of
	sys: exec() then walked that namespace and PERFORMED sys.breakpoint.

	A ModuleType subclass a program defined (``class Lazy(types.ModuleType)'',
	then ``m.__class__ = Lazy'') is a real Python type, and is answered as one:
	the nearest class in the chain that Python code defined wins."

	| c name |
	c := self @env0:class.
	[c ~~ nil and: [c ~~ module]] whileTrue: [
		(c @env0:includesSelector: #'___pyDefinedClass___' environmentId: 1)
			ifTrue: [^ c].
		c := c @env0:superclass].
	"ONLY A MODULE.  Some Smalltalk classes under ``module'' are not modules in
	Python at all -- sys.flags, sys.float_info, sys.implementation are
	NativeModule subclasses for their namespace plumbing -- and keep their own
	class, which reports CPython's name for them (``flags'' in ``sys'').  A
	module is a bare ``module'', or the module sys.modules holds under its
	__name__."
	self @env0:class == module ifTrue: [^ module].
	name := [self ___pyAttrLoad___: #'__name__']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	((name @env0:isKindOf: CharacterCollection)
		and: [(importlib lookupModule: name @env0:asString) == self])
			ifTrue: [^ module].
	^ self @env0:class

]

{ #category : 'Grail-Error Messages' }
module >> ___pyTypeNameForError___ [
	"``type(m).__name__'' -- ``module'', or the ModuleType subclass it was given.
	Object's asks the Smalltalk class, which for a module is the one Grail mints
	for it and names after it, so every message about a module named the module
	instead: ``'json' object is not callable''."

	^ (self __class__ __name__) @env0:asString

]

{ #category : 'Grail-Attribute Access' }
module >> ___unmarkGlobalDeleted___: aSym [
	"Storing a name revives it."

	| set |
	set := self ___deletedGlobals___.
	set @env0:isNil ifFalse: [set @env0:remove: aSym ifAbsent: []]

]

{ #category : 'Grail-Accessors' }
module >> __annotate__ [
	"PEP 649: the module's annotate function, or None.  ModuleAst stores the
	function in the module's own namespace as a dynamic instVar, which attribute
	loads probe first, so this answers only for a module with no annotations
	(measured: a module with none answers None) or one under ``from __future__
	import annotations'', where CPython also answers None."

	^ None

]

{ #category : 'Grail-Accessors' }
module >> __annotations__ [
	"PEP 649: the module's annotations, computed from __annotate__ on first read
	and cached in the namespace -- where CPython caches them too, so
	``'__annotations__' in mod.__dict__'' holds once read.  Reached only when no
	dict is stored yet: ModuleAst stores one eagerly under the future import, and
	the cache below is itself a dynamic instVar, which loads probe first.

	Grail used to have no module __annotations__ at all, so
	get_annotations(module) raised ``does not have annotations''."

	| annotate ann |
	annotate := self @env0:dynamicInstVarAt: #'__annotate__'.
	((annotate @env0:isNil) or: [annotate == None])
		"PyDict is resolved late: this file compiles before PyDict exists."
		ifTrue: [ann := (Python @env0:at: #'PyDict') @env0:new]
		ifFalse: [
			ann := annotate @env1:___pyCallValue___: { 1 } kw: nil.
			(ann @env0:isKindOf: KeyValueDictionary) ifFalse: [
				^ TypeError ___signal___: '__annotate__ returned a non-dict']].
	self @env0:dynamicInstVarAt: #'__annotations__' put: ann.
	^ ann

]

{ #category : 'Grail-Collection Protocol' }
module >> __bool__ [
	"A module object is ALWAYS truthy in Python, regardless of how
	many globals it holds.  Without this, ``bool(module)'' falls
	through to the dict-length path (module is a SymbolDictionary) and
	an empty-dict module reads as falsy — django.utils.module_loading's
	``cached_import'' does ``if not (module := sys.modules.get(...))
	and ...'', so a freshly-imported module wrongly looked unloaded."

	^ true

]

{ #category : 'Grail-Accessors' }
module >> __cached__ [
	"DELIBERATELY ABSENT.  Raises AttributeError, and this method exists only so
	that the absence is a recorded decision rather than an oversight.

	WHAT IT MEANS IN CPYTHON: the path of the module's compiled BYTECODE FILE --
	``__pycache__/<name>.cpython-314.pyc''.  It is derived, not primary:
	_init_module_attrs assigns ``module.__cached__ = spec.cached'', and
	ModuleSpec>>cached computes that from ``origin'' via cache_from_source.

	IT IS NOT A MODULE CACHE, and the name invites exactly that misreading.
	Grail's cache of already-imported modules is sys.modules, and its cache of
	compiled code is the module CLASS committed in the extent.  Neither is a
	file, and neither is what this attribute names.  Reporting either one here
	would be a wrong answer wearing a familiar name.

	WHY NOT A PATH ANYWAY.  Grail compiles Python to Smalltalk methods and never
	writes a .pyc.  A faithful implementation would still produce a path --
	ModuleSpec>>cached does NOT check that the file exists, so CPython hands out
	the path a .pyc WOULD have -- so being faithful here means naming a file
	Grail will never write.  That is worse than absence: code that reads
	__cached__ does so to find or invalidate a compiled artifact, and would be
	pointed at nothing.

	ABSENCE IS A LEGAL CPYTHON STATE, not a gap.  _init_module_attrs sets the
	attribute only ``if spec.cached is not None'', and a C-implemented module
	has no __cached__ at all: measured on 3.14.6, ``hasattr(sys, '__cached__')''
	is False.  So an AttributeError here is a shape CPython itself produces, and
	correct callers already spell the read ``getattr(m, '__cached__', None)''.

	This raises rather than answering None because None is a DIFFERENT claim --
	``there is a cache slot and it is empty'' rather than ``there is no such
	attribute'' -- and hasattr() must be False to match a C module."

	"A NAMESPACE ENTRY STILL WINS, so this is a default and not a veto.  A
	module body may assign ``__cached__ = ...'' itself, and CPython reads that
	back; an unconditional raise here made that impossible.  Found by the
	positive control for ModuleCachedAbsentTestCase: with an entry planted, the
	read still raised, which is the method shadowing the namespace.  Same shape
	as __doc__ above."
	(self @env0:includesKey: #'__cached__') ifTrue: [^ self @env0:at: #'__cached__'].
	^ AttributeError @env0:___signalMissing___: '__cached__' on: self

]

{ #category : 'Grail-Python-Protocol' }
module >> __class__ [
	"``m.__class__ is type(m)'', as CPython: see ___pyMetaclass___."

	^ self ___pyMetaclass___

]

{ #category : 'Grail-Protocol Refusal' }
module >> __contains__: key [
	<grailProtocolRefusal>
	"``'x' in mod'' raises CPython's catchable TypeError.  See __getitem__:."

	^ TypeError ___signal___: ('argument of type ''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' is not a container or iterable')

]

{ #category : 'Grail-Protocol Refusal' }
module >> __delitem__: key [
	<grailProtocolRefusal>
	"``del mod[k]'' raises CPython's catchable TypeError.  See __getitem__:."

	^ TypeError ___signal___: ('''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' object does not support item deletion')

]

{ #category : 'Grail-Accessors' }
module >> __dict__ [
	"Python ``mod.__dict__'' -- a LIVE view of the module's global
	namespace, same object semantics as globals() inside the module
	(writes create real globals; see PyModuleDict).  Category
	'Grail-Accessors' so attribute loads PERFORM this getter and hand
	back the view rather than wrapping it as a BoundMethod."

	^ (Python @env0:at: #'PyModuleDict') @env0:on: self

]

{ #category : 'Grail-Attribute Access' }
module >> __dir__ [
	"Module attribute names ONLY: dict entries (module-level value
	bindings), dynamic instVars, and the module class's OWN env-1
	methods (top-level defs + accessors).  Object's generic __dir__
	walks allSelectorsForEnvironment:, which for modules drags in the
	inherited SymbolDictionary/dict protocol — and a later
	getattr(module, name) EXECUTES unary methods, so dir()+getattr
	over that list would run popitem / clear / __getstate__ with
	their side effects.  unittest.TestLoader.loadTestsFromModule was
	the first caller to trip over this."

	| names cls declared |
	"CPython's module.__dir__ reads self.__dict__ and REFUSES when it is not a
	dictionary -- ``class Foo(ModuleType): __dict__ = 8'' is a real shape
	(test_builtin test_dir builds exactly it) and a module whose __dict__ has
	been replaced by something else cannot answer for its own names.  Grail
	ignored __dict__ entirely and enumerated selectors, so it answered a
	plausible-looking list for a module that is broken.

	Asked of the CLASS ATTRIBUTE rather than of ``self.__dict__'': an ordinary
	module has no stored __dict__ at all, so ___pyAttrLoad___ falls through to
	its method-wrap fallback and hands back a CALLABLE -- which is not a
	dictionary either, so reading it here condemned every module in the
	corpus and test_builtin could not even be imported.  The shape the test
	builds puts a real class attribute there (``class Foo(ModuleType):
	__dict__ = 8''), and ___dynamicClassAttr___ answers nil when none was
	declared, which is exactly the discrimination needed."
	declared := [self @env0:class @env1:___dynamicClassAttr___: #'__dict__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(declared @env0:notNil @env0:and: [
		((declared @env0:isKindOf: AbstractDictionary)
			@env0:or: [(declared @env0:isKindOf: KeyValueDictionary)
			@env0:or: [declared @env0:isKindOf: mappingproxy]]) @env0:not]) ifTrue: [
		^ TypeError ___signal___: '<module>.__dict__ is not a dictionary'].
	names := Set @env0:new.
	cls := self @env0:class.
	self @env0:keysDo: [:k | names @env0:add: k @env0:asString].
	(self @env0:dynamicInstanceVariables) @env0:do: [:k | names @env0:add: k @env0:asString].
	(cls @env0:selectorsForEnvironment: 1) @env0:do: [:sel |
		| s index skip |
		s := sel @env0:asString.
		skip := (self ___isGrailInternalSelector___: s)
			@env0:or: [(self ___isDeletedGlobal___: sel)
			@env0:or: [self ___isAbsentAccessor___: sel]].
		"The module BODY is compiled as an env-1 ``initialize'' method in
		category 'Grail-Module Body' (importlib class >>
		___defineModuleClass___).  It is an implementation artifact, not a
		Python attribute -- and reporting it here was actively destructive:
		a caller that walks dir() and getattr()s each name (unittest's
		loadTestsFromModule does exactly that) RE-RAN the whole module body,
		rebuilding every class the module defines.  The already-constructed
		TestCase classes then held first-generation classes while the module
		namespace answered second-generation ones, so pickle could not name
		them (test_bytes' SubclassTest.test_pickle).  Filter by CATEGORY, not
		by the name, so a module that legitimately defines ``def initialize()''
		still shows up."
		skip ifFalse: [
			| cat |
			cat := cls @env0:categoryOfSelector: sel environmentId: 1.
			"'Grail-Initialization' is the same artifact for a module written in
			SMALLTALK (enum.gs, functools.gs): its ``initialize'' populates the
			namespace at import and is Grail's setup hook, not something CPython's
			enum exports.  It leaked into dir(enum) as a public name, so every
			dir()-walking consumer saw an attribute that does not exist upstream --
			test_enum's test__all__ counted it as part of enum's API.

			Still a category test rather than a name test, for the reason above: a
			Python module's own ``def initialize()'' compiles into 'Grail-Module
			Body' or 'Grail-Methods', never into a hand-written Smalltalk
			category."
			skip := (cat @env0:= #'Grail-Module Body')
				or: [cat @env0:= #'Grail-Initialization']].
		skip ifFalse: [
			"A module-level ``def f(*args, **kwargs)'' compiles to the VARARGS
			selector ``_f:kw:'' -- Grail prefixes exactly one underscore.  That
			prefix is an encoding, not part of the Python name, so reporting it
			verbatim made a public function look private: ``enum.verify'' is
			spelled ``_verify:kw:'' and dir(enum) answered '_verify', which every
			caller that filters leading underscores (dir()-walking introspection,
			test.support.check__all__, pydoc) then dropped -- while
			getattr(enum, 'verify') worked perfectly.  Strip the one prefix
			underscore for that shape only, which leaves a genuinely private
			``def _f(*args)'' (compiled as ``__f:kw:'') still private."
			((s @env0:endsWith: ':kw:')
				and: [(s @env0:at: 1) @env0:= $_])
					ifTrue: [s := s @env0:copyFrom: 2 to: s @env0:size].
			index := s @env0:indexOf: $:.
			(index == 0) ifFalse: [s := s @env0:copyFrom: 1 to: (index @env0:- 1)].
			names @env0:add: s]].
	^ (names @env0:asSortedCollection: [:a :b | a @env0:<= b]) @env0:asArray

]

{ #category : 'Grail-Accessors' }
module >> __doc__ [
	"The module's own docstring, or None.

	NEVER Object's DOCSTRING.  This used to end ``^ super __doc__'', which
	climbs the Smalltalk superclass chain to Object and answers ``The base
	class of the class hierarchy...'' -- so EVERY module in the corpus reported
	that as its docstring, including ones whose real docstring was sitting in
	the source file unread.  It was not a missing feature but a wrong answer,
	and a plausible-looking one, which is why it survived: nothing raises and
	the value is a string.

	Two sources, in CPython's order of precedence:
	  * an entry in the module namespace, which is where the compiled docstring
	    is stamped (importlib class >> ___stampDocstringOn___:) and where an
	    explicit ``__doc__ = ...'' in the module body lands.  Either way the
	    module's own binding wins;
	  * None when there is none.  A module without a docstring HAS the
	    attribute and its value is None -- distinct from not having it.

	The includesKey: guard stays: an unguarded ``at:'' raises LookupError for a
	module with no docstring, now that a bare ``__doc__'' read performs this
	accessor rather than being mis-wrapped as a BoundMethod."

	(self @env0:includesKey: #__doc__) ifTrue: [^ self @env0:at: #__doc__].
	^ None

]

{ #category : 'Grail-Accessors' }
module >> __doc__: aValue [
	self @env0:at: #__doc__ put: aValue

]

{ #category : 'Grail-Comparison' }
module >> __eq__: other [
	"Modules compare BY IDENTITY, as CPython's do (module declares no
	__eq__, so object.__eq__ applies).  Without this the receiver inherited
	dict >> __eq__:, which accepts any KeyValueDictionary and compares
	contents -- so two distinct modules holding the same globals were equal.

	Punts with NotImplemented rather than answering false, the same rule
	object >> __eq__: and dict >> __eq__: follow: the operator layer then
	gets to try the REFLECTED __eq__ on the right-hand operand, so a class
	that declares itself equal to a module still works from either side."

	(self @env0:== other) ifTrue: [^ true].
	^ NotImplemented

]

{ #category : 'Grail-Protocol Refusal' }
module >> __getitem__: key [
	<grailProtocolRefusal>
	"``mod[k]'' raises CPython's catchable TypeError: a module is not a container.

	``module'' is a SymbolDictionary, so it inherited the env-1 dict protocol --
	against the kernel dictionary's own slots, not the module's globals.
	``json['dumps']'' raised KeyError, ``len(json)'' counted those slots,
	``json['x'] = 1'' stored an attribute, and a key that is not a string was an
	uncatchable MessageNotUnderstood (SymbolDictionary >> __getitem__: sends it
	asSymbol).  These six refusals stand for the protocol, so each raises what
	CPython raises and none is an attribute (#1632)."

	^ TypeError ___signal___: ('''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' object is not subscriptable')

]

{ #category : 'Grail-Hashing & Identity' }
module >> __hash__ [
	"A module hashes BY IDENTITY, exactly as a plain object does -- and
	consistently with __eq__: above, which is the whole point of them
	landing together.

	This override exists for the same reason __bool__ above does, and it is
	the same bug: the send used to land on the MAPPING's __hash__ -- the None
	that makes a dict unhashable -- so every module answered ``cannot use
	'dict' as a dict key (unhashable type: 'dict')''.  That is dict-shaped
	STORAGE leaking through to an object whose Python type is not a mapping.

	Modules are ordinary dict keys and set elements in Python, and real code
	relies on it: test_decimal builds five module-keyed dicts at import time
	(``Signals = {C: ..., P: ...}'', OrderedSignals, ORIGINAL_CONTEXT,
	fractions) to run one test body against both the C and the pure-Python
	decimal.  It scored IMPORTERROR on that line alone.

	``hash(m)'' raised, and so did ``hasattr(m, '__hash__')'' -- a bare
	PROBE for the attribute was enough -- which is why the absence went
	unnoticed: nothing in the corpus hashed a module until test_decimal did."

	^ self @env0:identityHash

]

{ #category : 'Grail-Initialization' }
module >> __init__: aName [
	"CPython's ``types.ModuleType(name)'' -- build a fresh, empty module.

	Without this, ``module'' inherits KeyValueDictionary's dict-style
	``__init__:'', which walks its argument as a sequence of key/value
	PAIRS.  Handed the string 'probe' it iterated the characters and then
	indexed into one, so ``types.ModuleType('probe')'' died on
	``Character at:'' -- surfacing as ValueError (``dictionary update
	sequence element #0 has length 1; 2 is required'') for a direct call,
	and as the UNCATCHABLE Smalltalk OffsetError ``object does not have
	varying instVars'' when a subclass reached it through
	``super().__init__(name)''.  That second shape is the one six uses
	(``class _LazyModule(types.ModuleType)''), and being uncatchable it
	could not be worked around from Python at all.

	Note this is a distinct creation path from Grail's ordinary modules,
	which are singletons of their OWN generated class and are built by
	``module class >> instance''.  A module made here belongs to whatever
	class the caller subclassed and is deliberately NOT registered as
	anyone's singleton -- it is a namespace object, which is exactly what
	callers of types.ModuleType want."

	self ___initName___: aName doc: None.
	^ None

]

{ #category : 'Grail-Initialization' }
module >> __init__: aName _: aDoc [
	"Two-argument form: ``types.ModuleType(name, doc)''."

	self ___initName___: aName doc: aDoc.
	^ None

]

{ #category : 'Grail-Protocol Refusal' }
module >> __iter__ [
	<grailProtocolRefusal>
	"``iter(mod)'' raises CPython's catchable TypeError.  See __getitem__:."

	^ TypeError ___signal___: ('''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' object is not iterable')

]

{ #category : 'Grail-Protocol Refusal' }
module >> __len__ [
	<grailProtocolRefusal>
	"``len(mod)'' raises CPython's catchable TypeError.  See __getitem__:."

	^ TypeError ___signal___: ('object of type ''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' has no len()')

]

{ #category : 'Grail-Accessors' }
module >> __loader__ [
	"None-as-absent (cf. __path__) — a bare read must not raise when
	the slot is unset."

	^ (self @env0:includesKey: #__loader__)
		ifTrue: [self @env0:at: #__loader__]
		ifFalse: [None]

]

{ #category : 'Grail-Accessors' }
module >> __loader__: aValue [
	self @env0:at: #__loader__ put: aValue

]

{ #category : 'Grail-Accessors' }
module >> __name__ [
	"The module's dotted name.  Guard the dict read with includesKey: — an
	unguarded ``at:'' raises a raw Smalltalk LookupError for a module with
	no ``__name__'' slot, and a Smalltalk error is invisible to Python's
	``except AttributeError''.  ``builtins'' is exactly such a module, so
	``max.__module__'' (BoundMethod>>__module__ forwards to the receiving
	module's __name__) killed any caller that merely PROBED for it —
	functools.update_wrapper reads __module__ off the wrapped function
	inside a try/except AttributeError.

	The fallback is the module class's own name, which is where a built-in
	module's identity actually lives (Grail names the class after the
	module).  Python-defined modules always carry the dict entry, set at
	import time, so they never reach the fallback."

	(self @env0:includesKey: #__name__) ifTrue: [^ self @env0:at: #__name__].
	"A built-in module whose Smalltalk class name is FLATTENED (``os_path''
	for os.path, ``html_entities'' for html.entities) must still report its
	real dotted name -- ``os.path.__name__'' is 'posixpath' in CPython, since
	os.path IS the posixpath module."
	(self @env0:class ___pythonModuleAttrIdentity___)
		@env0:ifNotNil: [:___id | ^ (___id @env0:at: 1)].
	^ self @env0:class @env0:name @env0:asString

]

{ #category : 'Grail-Accessors' }
module >> __name__: aValue [
	self @env0:at: #__name__ put: aValue

]

{ #category : 'Grail-Comparison' }
module >> __ne__: other [
	"The negation of __eq__ above, and here for the same reason: __ne__: was
	inherited from dict too, so it answered the CONTENTS comparison's
	negation.  Punts in the same case __eq__: punts, so the reflected
	__ne__ still gets its turn."

	(self @env0:== other) ifTrue: [^ false].
	^ NotImplemented

]

{ #category : 'Grail-Accessors' }
module >> __package__ [
	"None-as-absent (cf. __path__) — top-level modules have no package."

	^ (self @env0:includesKey: #__package__)
		ifTrue: [self @env0:at: #__package__]
		ifFalse: [None]

]

{ #category : 'Grail-Accessors' }
module >> __package__: aValue [
	self @env0:at: #__package__ put: aValue

]

{ #category : 'Grail-Accessors' }
module >> __path__ [
	"Return the module's __path__ if it has been set, else None. Modules
	that are packages have a __path__; plain modules do not. (CPython
	raises AttributeError instead, but None-as-absent is what existing
	Grail callers rely on.)"

	^ (self @env0:includesKey: #__path__)
		ifTrue: [self @env0:at: #__path__]
		ifFalse: [None]

]

{ #category : 'Grail-Accessors' }
module >> __path__: aValue [
	self @env0:at: #__path__ put: aValue

]

{ #category : 'Grail-Printing' }
module >> __repr__ [
	"CPython's module repr -- importlib._bootstrap._module_repr and
	_module_repr_from_spec, branch for branch:

	    <module 'sys' (built-in)>          spec with an origin, no location
	    <module 'p.p.p' from '/.../p.py'>  spec with a location
	    <module 'x'>                       spec with neither
	    <module 'x' from '/path'>          no spec, but a __file__

	A module is a SymbolDictionary underneath, so without this it printed its
	whole namespace as a dict -- repr(sys) was two thousand characters of
	``{'version': ...''.  test_reprlib's LongReprTest.test_module asserts both
	shapes.  Each read is guarded, as CPython's is: a repr must not raise
	because a module's dunders are odd."

	| rep name spec origin file |
	rep := [:obj | (Python @env0:at: #builtins) @env1:instance @env1:repr: obj].
	name := [self ___pyAttrLoad___: #'__name__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: '?'].
	spec := [self ___pyAttrLoad___: #'__spec__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: None].
	spec == None ifFalse: [
		| specName hasLocation |
		specName := [spec ___pyAttrLoad___: #name]
			@env0:on: AbstractException do: [:ex | ex @env0:return: None].
		specName == None ifTrue: [specName := name].
		origin := [spec ___pyAttrLoad___: #origin]
			@env0:on: AbstractException do: [:ex | ex @env0:return: None].
		origin == None ifTrue: [
			^ '<module ' @env0:, (rep value: specName) @env0:asString @env0:, '>'].
		hasLocation := [spec ___pyAttrLoad___: #'has_location']
			@env0:on: AbstractException do: [:ex | ex @env0:return: false].
		(hasLocation == true or: [hasLocation == True]) ifTrue: [
			^ '<module ' @env0:, (rep value: specName) @env0:asString
				@env0:, ' from ' @env0:, (rep value: origin) @env0:asString @env0:, '>'].
		^ '<module ' @env0:, (rep value: specName) @env0:asString
			@env0:, ' (' @env0:, origin @env0:asString @env0:, ')>'].
	file := [self ___pyAttrLoad___: #'__file__']
		@env0:on: AbstractException do: [:ex | ex @env0:return: None].
	file == None ifFalse: [
		^ '<module ' @env0:, (rep value: name) @env0:asString
			@env0:, ' from ' @env0:, (rep value: file) @env0:asString @env0:, '>'].
	^ '<module ' @env0:, (rep value: name) @env0:asString @env0:, '>'

]

{ #category : 'Grail-Attribute Access' }
module >> __setattr__: aName _: aValue [
	"``m.x = v'' as codegen emits it -- and the path that actually matters for
	reviving a deleted name.

	An assignment to a module attribute compiles to ``__setattr__'', not to
	___pyAttrStore___, so hooking only the latter left ``sys.stdout = f''
	after a ``del sys.stdout'' still raising.  Both are hooked; this is the
	one the language uses."

	self ___unmarkGlobalDeleted___: aName @env0:asString @env0:asSymbol.
	^ super __setattr__: aName _: aValue

]

{ #category : 'Grail-Protocol Refusal' }
module >> __setitem__: key _: value [
	<grailProtocolRefusal>
	"``mod[k] = v'' raises CPython's catchable TypeError.  It used to
	store k, and the store read back as a module attribute.  See __getitem__:."

	^ TypeError ___signal___: ('''' @env0:, (self @env0:___pyDnuTypeName___)
		@env0:, ''' object does not support item assignment')

]

{ #category : 'Grail-Accessors' }
module >> __spec__ [
	"None-as-absent (cf. __path__) — a bare read must not raise when
	the slot is unset."

	^ (self @env0:includesKey: #__spec__)
		ifTrue: [self @env0:at: #__spec__]
		ifFalse: [None]

]

{ #category : 'Grail-Accessors' }
module >> __spec__: aValue [
	self @env0:at: #__spec__ put: aValue

]

{ #category : 'Python-Mutation Methods' }
module >> update: other [
	"Merge ``other`` (a dict-like) into this module's namespace.  Used by
	Python sources that call `globals().update(...)`.  CallAst rewrites
	bare `globals()` to `self` for module-method context, so this lands
	on a module instance.

	Phase A: writes go to dynamic-instVar storage (the canonical home
	for module globals after the SymbolDictionary fast-path was
	removed).  NameAst codegen reads from the same store, so a name
	injected here via `globals().update({'X': 1})` is visible to any
	subsequent bare ``X'' reference in the module body."

	| isDict |
	isDict := other isKindOf: dict.
	isDict ifTrue: [
		other @env0:keysAndValuesDo: [:key :value |
			self @env0:dynamicInstVarAt: key @env0:asSymbol put: value
		]
	] ifFalse: [
		"Iterable of (key, value) pairs"
		other @env0:do: [:pair |
			self @env0:dynamicInstVarAt: (pair @env0:at: 1) @env0:asSymbol put: (pair @env0:at: 2)
		]
	]

]
