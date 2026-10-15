Extension { #name : 'ExecBlock' }

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___isSlotName___: aName [
	"True when aName addresses the SLOT namespace rather than __dict__.
	Accepts a String or a Symbol — ``setattr'' hands over whatever the
	caller wrote."

	^ self ___slotNames___ includes: aName asSymbol

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyAttrsClass___ [
	"Resolve the ExecBlockAttrs side-table class from the CALLING session's
	symbol list.  These ExecBlock methods are one shared SystemUser copy (see
	the file header); resolving ExecBlockAttrs at run time keeps each session on
	ITS OWN class -- whose storage is session-local SessionTemps anyway -- rather
	than hard-binding to the install user's copy."

	^ System myUserProfile symbolList objectNamed: #'ExecBlockAttrs'

]

{ #category : 'Grail-Attribute Access' }
ExecBlock class >> ___pyDefaultsFromKeys___: anEntry on: aClass [
	"Resolve a ___methodDefaultKeysTable___ entry -- ``{ { posKey ... } . { name .
	key ... } }'', compiled by ClassDefAst -- into ``{ posValues . kwPairs }'',
	reading each key from the per-class default store the class body filled
	(ClassDefAst >> emitMethodDefaultStoresOn:className:), so the values are the
	objects a call binds.  A key the store does not hold answers nil."

	| pos kw |
	pos := (anEntry at: 1) collect: [:k | aClass ___grailClassDefault___: k].
	kw := Array new: (anEntry at: 2) size.
	1 to: (anEntry at: 2) size by: 2 do: [:i |
		kw at: i put: ((anEntry at: 2) at: i).
		kw at: i + 1 put: (aClass ___grailClassDefault___: ((anEntry at: 2) at: i + 1))].
	^ { pos . kw }

]

{ #category : 'Grail-Attribute Access' }
ExecBlock class >> ___pyDefaultsTuple___: anArray [
	"``__defaults__'' from the raw positional default VALUES a function object
	found for itself: a tuple, or None when there are none -- or when one of
	them could not be recovered (nil), since a tuple with a hole would misalign
	every default after it.  Shared by BoundMethod, UnboundMethod and the
	closure accessor, so the three agree on that rule."

	(anArray == nil or: [anArray isEmpty]) ifTrue: [^ self ___pyNone___].
	(anArray includesIdentical: nil) ifTrue: [^ self ___pyNone___].
	^ self ___pyTupleClass___ perform: #'withAll:' env: 0 withArguments: { anArray }

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyEvalTypeParamBound___: aHex globals: aGlobalsOrNil [
	"Decode the hex-encoded source of a PEP 695 bound and evaluate it in
	aGlobalsOrNil with Python's eval.  nil when there are no globals to look in,
	or the expression cannot be evaluated there."

	| bytes src |
	aGlobalsOrNil @env0:isNil ifTrue: [^ nil].
	aGlobalsOrNil == ExecBlock @env0:___pyNone___ ifTrue: [^ nil].
	bytes := ByteArray @env0:new: aHex @env0:size @env0:// 2.
	1 to: bytes @env0:size do: [:i |
		bytes @env0:at: i put: (Integer @env0:fromHexString:
			(aHex @env0:copyFrom: i @env0:* 2 @env0:- 1 to: i @env0:* 2))].
	src := [bytes @env0:decodeFromUTF8] @env0:on: Error do: [:ex | ex @env0:return: nil].
	src @env0:isNil ifTrue: [^ nil].
	^ [((Python @env0:at: #builtins) @env1:instance)
			@env1:_eval: { src @env0:asString. aGlobalsOrNil } kw: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyGlobalsOfClass___: aClass [
	"The globals of the module that defined aClass -- a Python class, or a
	module's own class for a module-level def -- or nil when they cannot be
	found.  Where a class-side table's PEP 695 bounds are evaluated."

	^ [| mod name none |
		none := ExecBlock @env0:___pyNone___.
		(aClass @env0:inheritsFrom: (Python @env0:at: #module))
			ifTrue: [mod := aClass @env0:___instance___]
			ifFalse: [
				name := aClass @env1:___pyAttrLoad___: #'__module__'.
				mod := ((Python @env0:at: #sys) @env0:___instance___ @env1:___pyAttrLoad___: #'modules')
					@env1:get: name _: none].
		mod == none
			ifTrue: [nil]
			ifFalse: [mod @env1:___pyAttrLoad___: #'__dict__']]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Attribute Access' }
ExecBlock class >> ___pyKwDefaultsDict___: aFlatArray [
	"``__kwdefaults__'' from ``{ name1. value1. name2. value2 ... }'': a dict, or
	None when empty.  A value that could not be recovered (nil) is left out, so
	the parameter reads as required rather than as defaulting to nothing."

	| d |
	(aFlatArray == nil or: [aFlatArray isEmpty]) ifTrue: [^ self ___pyNone___].
	d := (Python at: #PyDict) perform: #new env: 0.
	1 to: aFlatArray size by: 2 do: [:i |
		(aFlatArray at: i + 1) == nil ifFalse: [
			d at: (aFlatArray at: i) put: (aFlatArray at: i + 1)]].
	d isEmpty ifTrue: [^ self ___pyNone___].
	^ d

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyNone___ [
	"Resolve the Python ``None'' singleton from the CALLING session's symbol
	list.  Same reason as ___pyAttrsClass___: this file compiles with only
	Globals visible (see the header), so a bare ``None'' would either fail to
	compile or bind to the install user's copy."

	^ System myUserProfile symbolList objectNamed: #'None'

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pythonValueAttrs___ [
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
		add: #'__closure__';
		add: #'__kwdefaults__';
		add: #'__signature_spec__';
		yourself

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyTupleClass___ [
	"Resolve the Python ``tuple'' class from the CALLING session's symbol
	list — same run-time-resolution rule as ___pyNone___."

	^ System myUserProfile symbolList objectNamed: #'tuple'

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyTypeParamsForClass___: aClass name: aName table: aTable [
	"``__type_params__'' for a def compiled to a METHOD -- a class-body def or a
	module-level one -- which cannot carry the ``___pyTypeParams___:'' cascade a
	closure does.  The NAMES come from aTable (the class-side
	___methodTypeParamsTable___ entry, or nil); the placeholders are built on
	first read and kept for the session, keyed by class and name.

	Kept because the objects are the parameters' IDENTITY: ``get_annotations(f,
	eval_str=True)'' resolves a stringized ``T'' through ``f.__type_params__'',
	and the caller then compares against a second read of it.  Session-scoped,
	like GrailMethodAnnotateCache, since a TypeVar is not persistent state."

	| store perClass key tup built |
	(aTable == nil or: [aTable @env0:isEmpty])
		ifTrue: [^ (ExecBlock @env0:___pyTupleClass___) @env0:withAll: #()].
	store := SessionTemps @env0:current
		@env0:at: #'GrailMethodTypeParamsCache'
		ifAbsentPut: [IdentityKeyValueDictionary @env0:new].
	perClass := store @env0:at: aClass ifAbsentPut: [KeyValueDictionary @env0:new].
	key := aName @env0:asString.
	tup := perClass @env0:at: key otherwise: nil.
	tup == nil ifFalse: [^ tup].
	built := aTable @env0:collect: [:n | ExecBlock @env0:___pyTypeVarNamed___: n
		globals: (ExecBlock @env0:___pyGlobalsOfClass___: aClass)].
	tup := (ExecBlock @env0:___pyTupleClass___) @env0:withAll: built.
	perClass @env0:at: key put: tup.
	^ tup

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyTypeVarNamed___: aName [
	"An opaque placeholder for a PEP 695 type parameter, minted through typing
	so it is the same kind of object user code gets from the explicit spelling:
	``*Ts'' is a TypeVarTuple, ``**P'' a ParamSpec, a bare name a TypeVar (the
	parser keeps the kind as a prefix -- PythonParser >> skipTypeParams).

	The one builder for every def and class shape.  typing is IMPORTED when it is
	not loaded yet: this runs on the first READ of __type_params__, never at def
	time, which is the moment the laziness exists to protect.  Falls back to the
	bare name STRING when typing cannot be had -- __type_params__ must answer
	something rather than fail, since functools.update_wrapper copies it."

	^ self ___pyTypeVarNamed___: aName globals: nil

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___pyTypeVarNamed___: aName globals: aGlobalsOrNil [
	"The one builder, with the defining module's globals for a BOUND.

	aName is the parser's entry (PythonParser >> skipTypeParams): the kind
	prefix, the name, and optionally ``:b<hex>'' (a bound) or ``:c<hex>''
	(constraints) carrying the bound's source.  The source is evaluated HERE, on
	first read of __type_params__ -- CPython evaluates a PEP 695 bound lazily
	too -- in aGlobalsOrNil, the defining module's namespace, which is where
	CPython's annotation scope finds the builtins and module-level names a
	bound almost always names.  A bound naming something only an enclosing
	FUNCTION sees cannot be found there; it is dropped (None), which is what
	every bound was before, rather than making the read fail.  (test_reprlib's
	test__type_params__: ``T.__bound__ is str''.)"

	| bare kind typing kw spec tpBound tpConstraints args idx |
	bare := aName @env0:asString.
	idx := bare @env0:indexOf: $:.
	idx @env0:> 0 ifTrue: [
		spec := bare @env0:copyFrom: idx @env0:+ 1 to: bare @env0:size.
		bare := bare @env0:copyFrom: 1 to: idx @env0:- 1.
		tpBound := self ___pyEvalTypeParamBound___: (spec @env0:copyFrom: 2 to: spec @env0:size)
			globals: aGlobalsOrNil.
		(tpBound @env0:notNil and: [(spec @env0:at: 1) == $c]) ifTrue: [
			tpConstraints := [tpBound @env1:___pyAttrLoad___: #'__len__'. tpBound]
				@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
			tpBound := nil]].
	kind := #'TypeVar'.
	((bare @env0:size > 2) and: [(bare @env0:copyFrom: 1 to: 2) @env0:= '**'])
		ifTrue: [bare := bare @env0:copyFrom: 3 to: bare @env0:size. kind := #'ParamSpec']
		ifFalse: [
			((bare @env0:size > 1) and: [(bare @env0:at: 1) == $*]) ifTrue: [
				bare := bare @env0:copyFrom: 2 to: bare @env0:size. kind := #'TypeVarTuple']].
	"@env1: on the Python sends: this helper is compiled in the file's env-0
	region.  Sent unprefixed they are simply not found, the guard swallows it,
	and the fallback quietly answers a STRING where a TypeVar belongs."
	typing := [((Python @env0:at: #builtins) @env1:instance)
			@env1:___import__: { 'typing' } kw: nil]
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	typing == nil ifTrue: [^ bare].
	"infer_variance, as CPython mints every PEP 695 TypeVar and ParamSpec: it
	 is observable, as ``__infer_variance__'' and in the repr (``T'', not
	 ``~T'').  A TypeVarTuple takes no variance."
	kw := kind == #'TypeVarTuple'
		ifTrue: [nil]
		ifFalse: [((Python @env0:at: #'PyDict') @env0:new)
			@env0:at: 'infer_variance' put: true; @env0:yourself].
	args := { bare }.
	kind == #'TypeVar' ifTrue: [
		tpBound @env0:notNil ifTrue: [kw @env0:at: 'bound' put: tpBound].
		tpConstraints @env0:notNil ifTrue: [
			args := args @env0:, (Array @env0:withAll: tpConstraints)]].
	^ [(typing @env1:___pyAttrLoad___: kind) @env1:___pyCallValue___: args kw: kw]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: bare]

]

{ #category : 'Grail-Python Attribute Hook' }
ExecBlock class >> ___slotNames___ [
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
		add: #'__closure__';
		add: #'__kwdefaults__';
		add: #'__signature_spec__';
		yourself

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyClosure___: anArrayOfCells [
	"Stamp this closure's ``__closure__'' cells at def-time.  Stored as the raw
	Array; ``__closure__'' wraps it as a tuple per read, which keeps the stamp
	cheap for the overwhelming majority of defs that nobody introspects.
	Returns self so it composes in the def-time cascade beside ___pyCode___:.

	Env 0, like ___pyCode___: beside it and for the same reason: FunctionDefAst
	emits the cascade as ``@env0:___pyClosure___:''.  Filed in the env-1 region
	it compiles fine and is simply never found at the call site."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__closure__' put: anArrayOfCells.
	^ self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyCode___: aCode [
	"Stamp this closure's ``__code__'' (a PyCode) at def-time.  FunctionDefAst's
	nested-def emit cascades this onto the block expression so
	``func.__code__.co_firstlineno'' answers the def's source line.  Writes the
	SLOT namespace (like __name__), and returns self so it composes in the
	``name := <block>'' assignment / decorator pipeline."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__code__' put: aCode.
	"And by the block's COMPILED METHOD, which is all a stack frame has: a
	frame of this function then reports this code as its f_code -- its def
	line and its identity -- rather than a stand-in with co_firstlineno 0.  A
	module-level def compiles to a method and has a code table; a nested def
	and every def in exec()'d code is a block and has only this."
	BaseException ___noteCode___: aCode forBlockMethod: self method.
	^ self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyKwDefaults___: aCell [
	"Stamp this closure's keyword-only-defaults CELL at def-time.  FunctionDefAst
	builds a one-slot holder (``{ <dict-or-nil> }'') in the def's outer wrapper,
	the function body captures it for its per-call keyword-only binding, and this
	cascade records the SAME object in the SLOT namespace so ``func.__kwdefaults__''
	reads it and ``func.__kwdefaults__ = X'' mutates it.  Returns self so it
	composes in the def-time cascade alongside ___pyCode___:."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__kwdefaults__' put: aCell.
	^ self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyModuleNamed___: aString [
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

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyNamed___: aString [
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

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyNamed___: aString annotate: aBlock [
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

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyNamed___: aString annotate: aBlock doc: aDoc [
	"Stamp all three of ``__name__'' / ``__annotate__'' / ``__doc__''
	for an annotated def that also has a docstring."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) annotateSlotAt: self attr: '__annotate__' put: aBlock.
	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__doc__' put: aDoc.
	^ self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyNamed___: aString doc: aDoc [
	"Stamp ``__name__'' and ``__doc__'' — the shape FunctionDefAst emits
	for a def that opens with a docstring but carries no annotations.
	One combined keyword send, since two chained ones would parse as a
	single selector."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__name__' put: aString.
	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__doc__' put: aDoc.
	^ self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyQualname___: aString [
	"Stamp ``__qualname__'' -- the dotted path including CPython's ``<locals>''
	marker for a def inside a function, e.g. ``Cls.meth.<locals>.inner''.

	Grail answered the bare name, which is right only at module or class level.
	The qualified form is observable because a function's repr prints it, so it
	lands in error messages callers match on.  DEF-SITE storage: the value is a
	property of where the def is written.  Returns self, to compose in the
	def-time cascade."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__qualname__' put: aString.
	^ self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pySig___: aSpec [
	"Stamp the def-time parameter spec.  Returns self so it composes in the
	def-time cascade alongside ___pyCode___:."

	(ExecBlock ___pyAttrsClass___) staticSlotAt: self attr: '__signature_spec__' put: aSpec.
	^ self

]

{ #category : 'Grail-Attribute Access' }
ExecBlock >> ___pyTypeParams___: names [
	"Stamp the def's PEP 695 type-parameter NAMES.  DEF-SITE storage: they are a
	property of where the def is written.  The placeholder objects themselves are
	built on first read of __type_params__, so def time never touches typing."

	(ExecBlock ___pyAttrsClass___)
		staticSlotAt: self attr: '___typeParamNames___' put: names.
	^ self

]
