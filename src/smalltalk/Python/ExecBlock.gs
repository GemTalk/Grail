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

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:slotAt: self attr: '__code__')
		ifNil: [ AttributeError ___signal___:
			'''function'' object has no attribute ''__code__''' ]
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
	Stamped at def-time by ___pyAnnotated___: (chained onto the block
	expression when the def carries any annotation); an un-annotated
	closure gets a fresh empty dict, matching CPython where every function
	has an ``__annotations__'' mapping.  A value attribute (see
	___pythonValueAttrs___) so the read returns the dict rather than a
	BoundMethod wrap.

	The empty dict is MEMOIZED into the slot on first read, as CPython
	does.  Returning a new one per call would make ``f.__annotations__ is
	f.__annotations__'' false, and functools.update_wrapper's contract is
	identity-based: check_wrapper asserts ``wrapper.__annotations__ is
	wrapped.__annotations__'' after the copy."

	| attrs cur |
	attrs := ExecBlock @env0:___pyAttrsClass___.
	cur := attrs @env0:slotAt: self attr: '__annotations__'.
	cur == nil ifFalse: [^ cur].
	^ attrs @env0:slotAt: self attr: '__annotations__'
		put: (KeyValueDictionary @env0:new)
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

	| attrs cur |
	attrs := ExecBlock @env0:___pyAttrsClass___.
	cur := attrs @env0:slotAt: self attr: '__type_params__'.
	cur == nil ifFalse: [^ cur].
	^ attrs @env0:slotAt: self attr: '__type_params__'
		put: ((ExecBlock @env0:___pyTupleClass___) @env0:withAll: #())
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

set compile_env: 0

category: 'Grail-Python Attribute Hook'
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
		add: #'__type_params__';
		add: #'__code__';
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
		add: #'__type_params__';
		add: #'__code__';
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

	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__name__' put: aString.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyNamed___: aString annotations: aDict
	"Stamp both ``__name__'' and ``__annotations__'' in one send.
	FunctionDefAst emits this (rather than two chained keyword sends,
	which Smalltalk would parse as a single ``___pyNamed___:annotations:''
	... which is in fact exactly this selector) for an annotated
	nested def.  The annotations dict is built at def-time in the
	enclosing scope.  Returns self so it composes transparently in the
	``name := <block>'' assignment / decorator pipeline
	(``functools.singledispatch.register'' reads the first parameter's
	annotation off a decorated local def this way)."

	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__annotations__' put: aDict.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyNamed___: aString doc: aDoc
	"Stamp ``__name__'' and ``__doc__'' — the shape FunctionDefAst emits
	for a def that opens with a docstring but carries no annotations.
	One combined keyword send, since two chained ones would parse as a
	single selector."

	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__doc__' put: aDoc.
	^ self
%

category: 'Grail-Attribute Access'
method: ExecBlock
___pyNamed___: aString annotations: aDict doc: aDoc
	"Stamp all three of ``__name__'' / ``__annotations__'' / ``__doc__''
	for an annotated def that also has a docstring."

	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__annotations__' put: aDict.
	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__doc__' put: aDoc.
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

	(ExecBlock ___pyAttrsClass___) slotAt: self attr: '__code__' put: aCode.
	^ self
%
