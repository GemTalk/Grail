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
	through a subsequent ``__getattr__'' read."

	^ (ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: name put: value
%

category: 'Grail-Attribute Access'
method: ExecBlock
__getattr__: name
	"Look up ``name'' in the ExecBlockAttrs side-table.  Raises
	AttributeError on miss, matching CPython's object.__getattr__
	fallback semantics so ``hasattr(block, name)'' returns the
	expected truth value."

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

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: '__name__')
		ifNil: ['<closure>']
%

category: 'Grail-Attribute Access'
method: ExecBlock
__qualname__
	"Mirror __name__ — Grail closures don't track lexical nesting."

	^ self __name__
%

category: 'Grail-Attribute Access'
method: ExecBlock
__module__
	"Default ``func.__module__'' for a closure-shaped callable.
	Same side-table-first semantics as __name__; falls back to the
	placeholder string when no decorator has stamped a value."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: '__module__')
		ifNil: ['<closure>']
%

category: 'Grail-Attribute Access'
method: ExecBlock
__annotations__
	"``func.__annotations__'' — the parameter/return annotation dict.
	Stamped at def-time by ___pyAnnotated___: (chained onto the block
	expression when the def carries any annotation); an un-annotated
	closure answers a fresh empty dict, matching CPython where every
	function has an ``__annotations__'' mapping.  A value attribute
	(see ___pythonValueAttrs___) so the read returns the dict rather
	than a BoundMethod wrap."

	^ ((ExecBlock @env0:___pyAttrsClass___) @env0:at: self attr: '__annotations__')
		ifNil: [KeyValueDictionary @env0:new]
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

category: 'Grail-Block Evaluation'
method: ExecBlock
value
	"Evaluate a zero-argument block"

	^ self @env0:value
%

category: 'Grail-Block Evaluation'
method: ExecBlock
value: arg1
	"Evaluate a one-argument block"

	^ self @env0:value: arg1
%

category: 'Grail-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2
	"Evaluate a two-argument block"

	^ self @env0:value: arg1 value: arg2
%

category: 'Grail-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3
	"Evaluate a three-argument block"

	^ self @env0:value: arg1 value: arg2 value: arg3
%

category: 'Grail-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3 value: arg4
	"Evaluate a four-argument block"

	^ self @env0:value: arg1 value: arg2 value: arg3 value: arg4
%

category: 'Grail-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3 value: arg4 value: arg5
	"Evaluate a five-argument block"

	^ self @env0:value: arg1 value: arg2 value: arg3 value: arg4 value: arg5
%

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
___pythonValueAttrs___
	"``__name__'' / ``__qualname__'' / ``__module__'' are Python
	identifying-metadata *value* attributes (the name STRING), not
	callables — so ``___pyAttrLoad___'' invokes them and returns the
	value instead of wrapping them as BoundMethods.  flask's
	``_endpoint_from_view_func'' reads ``view_func.__name__'' and keys
	``view_functions'' by it; without this a nested-def closure's
	``__name__'' came back as a BoundMethod and the endpoint mapping
	broke."

	^ IdentitySet new
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__annotations__';
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
	the ``name := <block>'' assignment / decorator pipeline."

	(ExecBlock ___pyAttrsClass___) at: self attr: '__name__' put: aString.
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

	(ExecBlock ___pyAttrsClass___) at: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) at: self attr: '__annotations__' put: aDict.
	^ self
%
