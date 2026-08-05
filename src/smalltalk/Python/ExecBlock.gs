! ===============================================================================
! ExecBlock Methods (Python callable blocks)
! ===============================================================================
! This file contains Python method implementations for the ExecBlock class.
! These methods allow code blocks returned from Python built-in functions to be
! called with arguments using Python-style syntax.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
!
! ExecBlock's value-family selectors are VM-special, so these methods can't be
! per-user session methods; they are filed persistently as SystemUser (one copy
! shared by every user).  So the one shared copy never binds to the install
! user's Python globals, the per-user objects it needs -- the ExecBlockAttrs
! side-table class and AttributeError -- are resolved at run time through the
! calling session's own symbol list (___pyAttrsClass___ below; same idiom as
! Class.gs>>__base__).  Each caller therefore gets ITS OWN classes.
! ===============================================================================

! ------------------- Remove existing Python methods from ExecBlock
expectvalue /Metaclass3
doit
ExecBlock removeAllMethods: 1.
ExecBlock class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Callable'
method: ExecBlock
__call__: args
	"Call the block with the given arguments.
	 This makes ExecBlock callable in Python's sense."

	^ self @env0:valueWithArguments: args
%

category: 'Grail-Attribute Access'
method: ExecBlock
__setattr__: name _: value
	"Store ``name -> value'' in the ExecBlockAttrs side-table.
	GemStone's primitive ExecBlock has no varying instVars, so the
	default Object>>__setattr__ path (dynamicInstVarAt:put: on the
	receiver) raises ImproperOperation.  Routes through the helper
	class so Python code that legitimately tags closures with
	metadata (jinja2.async_utils stamps ``wrapper.jinja_async_variant
	= True'' on the nested decorator-output closure) round-trips
	through a subsequent ``__getattr__'' read.

	The six identifying-metadata dunders go to the SLOT table, every
	other name to the ``__dict__'' table — see ___isSlotName___:."

	"``func.__kwdefaults__ = X'' must change what the NEXT call binds, so it is
	routed to the shared kwdefaults cell (a def-time holder the function body
	captures) rather than overwriting the slot -- see ___setKwDefaults___:."
	(name @env0:asSymbol == #'__kwdefaults__') ifTrue: [
		^ self @env1:___setKwDefaults___: value].
	^ (ExecBlock @env0:___isSlotName___: name)
		@env0:ifTrue: [
			(ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: name put: value]
		@env0:ifFalse: [
			(ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: name put: value]
%

category: 'Grail-Attribute Access'
method: ExecBlock
__getattr__: name
	"Look up ``name'' in the ExecBlockAttrs side-table.  Raises
	AttributeError on miss, matching CPython's object.__getattr__
	fallback semantics so ``hasattr(block, name)'' returns the
	expected truth value.

	Only the ``__dict__'' table is consulted: every SLOT name has a real
	env-1 method below, and Grail's attribute protocol prefers a compiled
	method over ``__getattr__'' — so a slot read never arrives here."

	| value |
	value := (ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: name.
	value == nil ifTrue: [
		^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError') ___signal___:
			('ExecBlock object has no attribute ''' @env0:, name @env0:asString @env0:, '''')
	].
	^ value
%

category: 'Grail-Attribute Access'
method: ExecBlock
__delattr__: name
	"``del block.attr'' / ``delattr(block, name)'' — drop the entry from the
	``__dict__'' table.  Object's default ___pyAttrDelete___: works on
	dynamic instVars, which a primitive ExecBlock has none of, so without
	this every deletion raised AttributeError even for an attribute that
	had just been set (functools' test_missing_attributes deletes the
	wrapper's ``dict_attr'' and expects the NEXT update_wrapper to be the
	thing that raises).

	A genuinely absent name still raises, per CPython."

	((ExecBlock @env0:___pyAttrsClass___) @env0:removeAt: self attr: name)
		ifTrue: [^ ExecBlock @env0:___pyNone___].
	^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError') ___signal___:
		(name @env0:asString)
%

category: 'Grail-Attribute Access'
method: ExecBlock
__dict__
	"``func.__dict__'' — the LIVE user-attribute mapping, not a snapshot.

	Liveness is required, not a nicety: functools.update_wrapper copies
	attributes by doing ``getattr(wrapper, '__dict__').update(...)'', so a
	copy handed back here would absorb the merge and leave the wrapper's
	real attributes untouched.

	Excludes __name__ / __qualname__ / __module__ / __doc__ /
	__annotations__ / __type_params__ — CPython implements those as getset
	descriptors rather than dict entries, and they live in a separate slot
	table for exactly that reason (see ExecBlockAttrs)."

	^ (ExecBlock @env0:___pyAttrsClass___) @env0:forBlock: self
%

category: 'Grail-Attribute Access'
method: ExecBlock
__name__
	"Default ``func.__name__'' for a closure-shaped callable.  No
	lexical name is recoverable from a plain block, so return a
	generic placeholder that decorator consumers (Flask's
	``@app.route'' reading ``view_func.__name__'' to pick the
	rule's endpoint, functools.wraps copying the stamp) can store
	without crashing.  A prior ``__setattr__: '__name__''' write
	wins — the side-table read in ``__getattr__'' fires first via
	the Python attribute protocol, and this fallback only runs
	when the slot is unset.

	Phrased as a normal env-1 method (not a __getattr__ branch) so
	``hasattr(block, '__name__')'' is always true."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__name__')
		ifNil: ['<closure>']
%

category: 'Grail-Attribute Access'
method: ExecBlock
__code__
	"``func.__code__'' -- the PyCode stamped at def-time (FunctionDefAst cascades
	``___pyCode___:'' onto the block), or AttributeError for a synthetic block
	that never got one (CPython real functions always have a code object; a bare
	block is not one).  #'__code__' is in ___pythonValueAttrs___ so a read
	returns the PyCode value, not a BoundMethod-wrapped selector."

	| c |
	c := (ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__code__'.
	c ifNotNil: [ ^ c ].
	"AttributeError lives in the Python dictionary, which is NOT on the symbol
	list when this kernel-extension file is filed by install_base (SystemUser,
	3.7.x) -- naming the class directly there is a compile-time ``undefined
	symbol''.  Resolve it at RUNTIME via the symbol list, the same rule
	___pyNone___ uses."
	^ (System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'AttributeError')
		___signal___: '''function'' object has no attribute ''__code__'''
%

category: 'Grail-Attribute Access'
method: ExecBlock
__kwdefaults__
	"``func.__kwdefaults__'' -- a dict mapping each keyword-only parameter that
	has a default to that default's VALUE, or None when the function declares no
	keyword-only defaults.  FunctionDefAst stamps a def-time CELL (a one-slot
	holder) via ___pyKwDefaults___:; the value read here is the cell's current
	contents, so a later ``func.__kwdefaults__ = X'' (which mutates the same
	cell) is reflected both here and in what the next call binds.  #'__kwdefaults__'
	is in ___pythonValueAttrs___ so this returns the dict/None value, not a
	BoundMethod-wrapped selector.  A block that never got a cell (no keyword-only
	params, or a synthetic block) reads None, matching CPython."

	| cell |
	cell := (ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__kwdefaults__'.
	cell @env0:isNil ifTrue: [^ ExecBlock @env0:___pyNone___].
	^ (cell @env0:at: 1) ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Attribute Access'
method: ExecBlock
___setKwDefaults___: value
	"Backing for ``func.__kwdefaults__ = value''.  Mutates the shared def-time
	cell in place rather than replacing the slot, so the function body -- which
	captured that same cell object at def-time -- consults the new value on the
	next call.  Python None clears the defaults (stored as nil, so every
	keyword-only parameter becomes required again).  A block with no cell yet
	(had no keyword-only params) gets one created, so the attribute round-trips."

	| cell stored |
	stored := (value == (ExecBlock @env0:___pyNone___)) ifTrue: [nil] ifFalse: [value].
	cell := (ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__kwdefaults__'.
	cell @env0:isNil ifTrue: [
		cell := Array @env0:new: 1.
		(ExecBlock @env0:___pyAttrsClass___) @env0:staticSlotAt: self attr: '__kwdefaults__' put: cell].
	cell @env0:at: 1 put: stored.
	^ ExecBlock @env0:___pyNone___
%

category: 'Grail-Attribute Access'
method: ExecBlock
__qualname__
	"``func.__qualname__'' — a stamped value if one exists, else __name__.
	Grail closures don't track lexical nesting, so the fallback is the bare
	name; the slot read has to come first because functools.update_wrapper
	assigns __qualname__ INDEPENDENTLY of __name__ (with ``assigned=()''
	the wrapper must keep its own name while a later explicit
	``wrapper.__qualname__ = ...'' still sticks)."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__qualname__')
		ifNil: [self __name__]
%

category: 'Grail-Attribute Access'
method: ExecBlock
__module__
	"Default ``func.__module__'' for a closure-shaped callable.
	Same slot-table-first semantics as __name__; falls back to the
	placeholder string when no decorator has stamped a value.

	The fallback is a method LITERAL, so every unstamped closure answers
	the identical object -- ``update_wrapper'' copies it and
	``wrapper.__module__ is wrapped.__module__'' then holds, which is what
	CPython guarantees for a real module name."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__module__')
		ifNil: ['<closure>']
%

category: 'Grail-Attribute Access'
method: ExecBlock
__doc__
	"``func.__doc__'' — the def's docstring, or None.

	Object>>__doc__ answers the docstring of ``object'' itself, and every
	receiver inherits it, so before this method EVERY Grail closure claimed
	to be documented as ``The base class of the class hierarchy...'' —
	including one that had just been handed a real docstring by
	``setattr(f, '__doc__', ...)'', because a compiled method outranks the
	side-table __getattr__ read.  CPython answers None for an undocumented
	function, and functools' test_no_update / test_selective_update assert
	exactly that."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__doc__')
		ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Attribute Access'
method: ExecBlock
__annotations__
	"``func.__annotations__'' — the parameter/return annotation dict.

	PEP 649: this is DERIVED, by calling the def's ``__annotate__'' with
	Format.VALUE.  The annotation expressions are therefore evaluated
	HERE, on first read, not at def-time -- which is what makes a forward
	reference to a name bound later in the module work, and what a
	NameError from an annotation naming nothing at all reports (CPython
	raises it from the read, not from the module load).

	An un-annotated closure has no ``__annotate__'' and gets a fresh empty
	dict, matching CPython where every function has the mapping.  A value
	attribute (see ___pythonValueAttrs___) so the read returns the dict
	rather than a BoundMethod wrap.

	The result is MEMOIZED into the slot on first read, as CPython does.
	Returning a new one per call would make ``f.__annotations__ is
	f.__annotations__'' false, and functools.update_wrapper's contract is
	identity-based: check_wrapper asserts ``wrapper.__annotations__ is
	wrapped.__annotations__'' after the copy.  Memoizing also means a
	NameError is raised on EVERY read rather than once, since a failed
	call stores nothing."

	| attrs cur annotate |
	attrs := ExecBlock @env0:___pyAttrsClass___.
	cur := attrs @env0:slotAt: self attr: '__annotations__'.
	cur == nil ifFalse: [^ cur].
	annotate := attrs @env0:slotAt: self attr: '__annotate__'.
	annotate == nil ifTrue: [
		^ attrs @env0:slotAt: self attr: '__annotations__'
			put: (KeyValueDictionary @env0:new)].
	^ attrs @env0:slotAt: self attr: '__annotations__'
		put: (annotate @env0:value: { 1 } value: nil)
%

category: 'Grail-Attribute Access'
method: ExecBlock
__signature_spec__
	"The def-time parameter spec inspect.signature reads -- an Array of
	``(name, kind-index, default-source-text-or-nil)'' triples in declaration
	order, stamped by FunctionDefAst.  None for a def with no parameters,
	which renders as ``()'' regardless.

	Grail has no code object to introspect, so the compiler records what it
	already knows instead of synthesising ``co_varnames''/``co_argcount''.
	Nothing observable needs the code-object form: across the whole CPython
	corpus the only ``co_*'' fields read are co_firstlineno and co_name,
	both of which PyCode already carries."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__signature_spec__')
		ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Attribute Access'
method: ExecBlock
__annotate__
	"``func.__annotate__'' — PEP 649's annotation-computing function, a
	one-argument callable taking a Format and answering the annotation
	dict.  FunctionDefAst stamps it at def-time for any def that carries
	an annotation; None when the def carries none, as in CPython.

	It is the SHARED, identity-bearing object the annotation protocol is
	built on: functools.update_wrapper copies this attribute rather than
	the computed dict, and test_update_wrapper_annotations asserts
	``wrapper.__annotate__ is inner.__annotate__''."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__annotate__')
		ifNil: [ExecBlock @env0:___pyNone___]
%

category: 'Grail-Attribute Access'
method: ExecBlock
__type_params__
	"``func.__type_params__'' — PEP 695 type parameters.

	Grail's parser accepts ``def f[T](...)'' but discards the bracket, so
	this is ALWAYS the empty tuple; it exists because it is one of
	functools.WRAPPER_ASSIGNMENTS, and a name in that list that raises
	AttributeError on the WRAPPER turns update_wrapper's callers into
	errors rather than copies.

	Memoized on first read for the same identity reason as
	__annotations__."

	| attrs cur names built |
	attrs := ExecBlock @env0:___pyAttrsClass___.
	cur := attrs @env0:slotAt: self attr: '__type_params__'.
	cur == nil ifFalse: [^ cur].
	"The def site stamps the NAMES (``def f[T]'' -> #('T')); the placeholders are
	built on first read, so nothing has to reach typing at def time."
	names := attrs @env0:staticSlotAt: self attr: '___typeParamNames___'.
	built := (names == nil or: [names @env0:isEmpty])
		ifTrue: [#()]
		ifFalse: [names @env0:collect: [:n | ExecBlock @env0:___pyTypeVarNamed___: n]].
	^ attrs @env0:slotAt: self attr: '__type_params__'
		put: ((ExecBlock @env0:___pyTupleClass___) @env0:withAll: built)
%

category: 'Grail-Callable'
method: ExecBlock
___pyCallValue___: positional kw: kwargs
	"Polymorphic Python call.  A Smalltalk block stored as a Python
	callable comes in two shapes:

	  (1) A block produced by Grail's CallAst.printKeywordsDictOn:
	      pattern — ``[:positional2 :keywords2 | <body>]'' that
	      takes two args (the positional array and the kwargs dict).
	      Decorator factories like ``functools.lru_cache(N)'' return
	      this shape so a subsequent decorator invocation ``deco(fn)''
	      can route uniformly through ``___pyCallValue___:kw:''.
	  (2) A bare block whose arity matches ``positional size''.

	Dispatch on numArgs to pick the right shape: when the block
	takes exactly 2 args, forward as (positional, kwargs);
	otherwise splat ``positional'' via ``valueWithArguments:''.
	Kwargs are dropped in case (2) — the call shape doesn't carry
	them."

	^ self @env0:numArgs == 2
		@env0:ifTrue: [self @env0:value: positional value: kwargs]
		@env0:ifFalse: [self @env0:valueWithArguments: positional]
%

! ------------------- NOTE: no fixed-arity value / value: ... value:*5 here.
! The fixed-arity block-invocation selectors (value, value:, value:value:, ...)
! are VM-reserved: the compiler inlines them as block invocation regardless of
! the send's environment, so an env-1 `aBlock @env1:value: x' already reaches the
! env-0 block invocation WITHOUT any env-1 wrapper (verified).  Grail's former
! env-1 wrappers here were pure redirects (`^ self @env0:value: ...') and thus
! redundant; they also could NOT be per-user session methods (the VM rejects
! compiling a method for a reserved selector -- CompileError 1001).  Removing them
! is transparent to callers (they hit the VM auto-route) AND lets the rest of this
! file be filed as per-user session methods on a modern kernel.  `valueWithArguments:'
! is NOT auto-routed (it DNUs without a method) and is NOT a reserved selector, so
! it stays below as a real (session-method-eligible) wrapper.

category: 'Grail-Block Evaluation'
method: ExecBlock
valueWithArguments: anArray
	"Evaluate the block with an array of arguments"

	^ self @env0:valueWithArguments: anArray
%

category: 'Grail-Representation'
method: ExecBlock
__repr__
	"``<function NAME at 0xADDR>'', CPython's shape.  Grail answered
	``<ExecBlock object>'', which shows up wherever a function is printed --
	including inside error messages callers match on (functools' register()
	names the offending function in the TypeError it raises).

	Must live in the env-1 region: compiled into env 0 it is invisible to
	Python attribute dispatch, so ``repr(f)'' kept reaching Object's default."

	^ ('<function ' @env0:, self __qualname__ @env0:asString
		@env0:, ' at 0x' @env0:, (self @env0:identityHash @env0:printStringRadix: 16)
		@env0:asLowercase @env0:, '>') @env0:asUnicodeString
%

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: ExecBlock
___pyTypeVarNamed___: aName
	"An opaque placeholder for a PEP 695 type parameter, minted through
	``typing.TypeVar'' so it is the same kind of object user code gets from the
	explicit spelling.  Falls back to the name STRING when typing is not loaded --
	__type_params__ must answer something rather than fail, since
	functools.update_wrapper copies it."

	| mods typing |
	"@env1: on both sends: this helper is compiled in the file's env-0 region, and
	``modules'' / ``TypeVar:'' are env-1 methods.  Sent unprefixed they are simply
	not found, the guard swallows it, and the fallback quietly answers a STRING
	where a TypeVar belongs -- silent, because the fallback exists for the
	typing-not-loaded case and cannot tell the two apart."
	mods := [(System @env0:myUserProfile @env0:symbolList
		@env0:objectNamed: #importlib) @env1:modules]
			@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	mods == nil ifTrue: [^ aName].
	typing := (mods @env0:at: 'typing' otherwise: nil)
		@env0:ifNil: [mods @env0:at: #'typing' otherwise: nil].
	typing == nil ifTrue: [^ aName].
	^ [typing @env1:TypeVar: aName]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: aName]
%

classmethod: ExecBlock
___pyAttrsClass___
	"Resolve the ExecBlockAttrs side-table class from the CALLING session's
	symbol list.  These ExecBlock methods are one shared SystemUser copy (see
	the file header); resolving ExecBlockAttrs at run time keeps each session on
	ITS OWN class -- whose storage is session-local SessionTemps anyway -- rather
	than hard-binding to the install user's copy."

	^ System myUserProfile symbolList objectNamed: #'ExecBlockAttrs'
%

category: 'Grail-Python Attribute Hook'
classmethod: ExecBlock
___pyNone___
	"Resolve the Python ``None'' singleton from the CALLING session's symbol
	list.  Same reason as ___pyAttrsClass___: this file compiles with only
	Globals visible (see the header and install_base.gs), so a bare ``None''
	would either fail to compile or bind to the install user's copy."

	^ System myUserProfile symbolList objectNamed: #'None'
%

category: 'Grail-Python Attribute Hook'
classmethod: ExecBlock
___pyTupleClass___
	"Resolve the Python ``tuple'' class from the CALLING session's symbol
	list — same run-time-resolution rule as ___pyNone___."

	^ System myUserProfile symbolList objectNamed: #'tuple'
%

category: 'Grail-Python Attribute Hook'
classmethod: ExecBlock
___slotNames___
	"The attribute names CPython implements on a function as getset
	descriptors rather than ``__dict__'' entries.  ``__setattr__'' routes
	these to the side-table's SLOT namespace so they stay out of
	``func.__dict__'' — which matters because functools.update_wrapper
	merges the wrapped function's whole __dict__ into the wrapper.

	``__wrapped__'' is deliberately NOT here: CPython keeps it in __dict__,
	and test_functools' check_wrapper relies on finding it there."

	^ IdentitySet new
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__doc__';
		add: #'__annotations__';
		add: #'__annotate__';
		add: #'__type_params__';
		add: #'__code__';
		add: #'__kwdefaults__';
		add: #'__signature_spec__';
		yourself
%

category: 'Grail-Python Attribute Hook'
classmethod: ExecBlock
___isSlotName___: aName
	"True when aName addresses the SLOT namespace rather than __dict__.
	Accepts a String or a Symbol — ``setattr'' hands over whatever the
	caller wrote."

	^ self ___slotNames___ includes: aName asSymbol
%

category: 'Grail-Python Attribute Hook'
classmethod: ExecBlock
___pythonValueAttrs___
	"``__name__'' / ``__qualname__'' / ``__module__'' are Python
	identifying-metadata *value* attributes (the name STRING), not
	callables — so ``___pyAttrLoad___'' invokes them and returns the
	value instead of wrapping them as BoundMethods.  flask's
	``_endpoint_from_view_func'' reads ``view_func.__name__'' and keys
	``view_functions'' by it; without this a nested-def closure's
	``__name__'' came back as a BoundMethod and the endpoint mapping
	broke.

	``__doc__'' / ``__dict__'' / ``__type_params__'' are here for the same
	reason: functools.update_wrapper reads each of WRAPPER_ASSIGNMENTS off
	the wrapped function and re-assigns it, so a BoundMethod wrap would
	copy the accessor instead of the value."

	^ IdentitySet new
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__doc__';
		add: #'__dict__';
		add: #'__annotations__';
		add: #'__annotate__';
		add: #'__type_params__';
		add: #'__code__';
		add: #'__kwdefaults__';
		add: #'__signature_spec__';
		yourself
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyNamed___: aString
	"Stamp this closure's ``__name__'' from the def's lexical name.
	FunctionDefAst's nested-def emit chains this onto the block
	expression (``[...] @env0:___pyNamed___: 'hello''') so
	``func.__name__'' returns the real name rather than the
	``<closure>'' placeholder.  Returns self so it sits transparently in
	the ``name := <block>'' assignment / decorator pipeline.

	Writes the SLOT namespace, not __dict__: CPython's ``__name__'' is a
	getset descriptor, and a def-time stamp visible in ``func.__dict__''
	would be copied onto every wrapper by functools.update_wrapper's
	__dict__ merge."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__name__' put: aString.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyNamed___: aString annotate: aBlock
	"Stamp both ``__name__'' and ``__annotate__'' in one send.
	FunctionDefAst emits this (rather than two chained keyword sends,
	which Smalltalk would parse as a single ``___pyNamed___:annotate:''
	... which is in fact exactly this selector) for an annotated
	nested def.

	aBlock is the PEP 649 annotate FUNCTION, built at def-time in the
	enclosing scope so that its captured scope is the def's own -- but
	NOT called until ``__annotations__'' is read.  Returns self so it
	composes transparently in the ``name := <block>'' assignment /
	decorator pipeline (``functools.singledispatch.register'' reads the
	first parameter's annotation off a decorated local def this way)."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) annotateSlotAt: self attr: '__annotate__' put: aBlock.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyNamed___: aString doc: aDoc
	"Stamp ``__name__'' and ``__doc__'' — the shape FunctionDefAst emits
	for a def that opens with a docstring but carries no annotations.
	One combined keyword send, since two chained ones would parse as a
	single selector."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__doc__' put: aDoc.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyNamed___: aString annotate: aBlock doc: aDoc
	"Stamp all three of ``__name__'' / ``__annotate__'' / ``__doc__''
	for an annotated def that also has a docstring."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) annotateSlotAt: self attr: '__annotate__' put: aBlock.
	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__doc__' put: aDoc.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyTypeParams___: names
	"Stamp the def's PEP 695 type-parameter NAMES.  DEF-SITE storage: they are a
	property of where the def is written.  The placeholder objects themselves are
	built on first read of __type_params__, so def time never touches typing."

	(ExecBlock ___pyAttrsClass___)
		staticSlotAt: self attr: '___typeParamNames___' put: names.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyModuleNamed___: aString
	"Stamp ``__module__'' at the def site.

	A closure otherwise answers the ``<closure>'' placeholder: a module-level def
	is a BoundMethod and gets its module by forwarding to the receiving module,
	but a block has no receiver to forward to.  That left every def compiled as a
	closure -- notably one written under an ``if'' in a class body -- unable to
	be pickled by reference, because pickle resolves a callable through its
	__module__ and __qualname__.

	DEF-SITE storage, like the qualname beside it: the module a def is written in
	is a property of where it is written.  Returns self, to compose in the
	def-time cascade."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__module__' put: aString.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyQualname___: aString
	"Stamp ``__qualname__'' -- the dotted path including CPython's ``<locals>''
	marker for a def inside a function, e.g. ``Cls.meth.<locals>.inner''.

	Grail answered the bare name, which is right only at module or class level.
	The qualified form is observable because a function's repr prints it, so it
	lands in error messages callers match on.  DEF-SITE storage: the value is a
	property of where the def is written.  Returns self, to compose in the
	def-time cascade."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__qualname__' put: aString.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pySig___: aSpec
	"Stamp the def-time parameter spec.  Returns self so it composes in the
	def-time cascade alongside ___pyCode___:."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__signature_spec__' put: aSpec.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyCode___: aCode
	"Stamp this closure's ``__code__'' (a PyCode) at def-time.  FunctionDefAst's
	nested-def emit cascades this onto the block expression so
	``func.__code__.co_firstlineno'' answers the def's source line.  Writes the
	SLOT namespace (like __name__), and returns self so it composes in the
	``name := <block>'' assignment / decorator pipeline."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__code__' put: aCode.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyKwDefaults___: aCell
	"Stamp this closure's keyword-only-defaults CELL at def-time.  FunctionDefAst
	builds a one-slot holder (``{ <dict-or-nil> }'') in the def's outer wrapper,
	the function body captures it for its per-call keyword-only binding, and this
	cascade records the SAME object in the SLOT namespace so ``func.__kwdefaults__''
	reads it and ``func.__kwdefaults__ = X'' mutates it.  Returns self so it
	composes in the def-time cascade alongside ___pyCode___:."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__kwdefaults__' put: aCell.
	^ self
%
