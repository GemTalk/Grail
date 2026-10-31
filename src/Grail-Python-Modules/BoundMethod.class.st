"A first-class handle to a Smalltalk method on a specific receiver, used to
support Python ""function as value"" semantics in the dispatch model.

Background. Python lets you read a function as a value:

    f = abs
    f(-5)              # 5

In the current dispatch model (see docs/Rewrite_Dispatch_Model.md), the
direct call `abs(-5)` compiles to a fast-path Smalltalk method send
`(builtins instance) abs: -5`. But the assignment `f = abs` requires
something callable to be stored in the local `f`. We can't store a
CompiledMethod and send `value:` to it directly (current GemStone does
not allow that), so we wrap it in a small object that knows its receiver
and selector.

Selectors for common arities (0..3 positional args) are precomputed at
construction time, avoiding the ~230 ns per-call cost of building them
dynamically via WriteStream + asSymbol. The dispatch path tries the
precomputed fixed-arity selector first; if that selector has no matching
method, it falls back to the `_name:kw:` varargs convention (also
precomputed).

"
Class {
	#name : 'BoundMethod',
	#superclass : 'Object',
	#instVars : [
		'receiver',
		'selector',
		'sel0',
		'sel1',
		'sel2',
		'sel3',
		'selVarargs',
		'definingClass',
		'pinGeneration'
	],
	#classVars : [
		'GrailPinnedSelectors',
		'GrailPinGeneration'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Annotations' }
BoundMethod class >> ___annotationsComputedBy___: anAnnotate [
	"anAnnotate called with Format.VALUE, which must answer a dict -- CPython's
	TypeError names what it answered instead."

	| annotations |
	annotations := anAnnotate @env1:___pyCallValue___: { 1 } kw: nil.
	(annotations isKindOf: KeyValueDictionary) ifFalse: [
		TypeError @env1:___signal___: ('__annotate__ returned non-dict of type '''
			, ((Python at: #bytes) @env1:___pyTypeNameOf___: annotations) , '''')].
	^ annotations

]

{ #category : 'Grail-Annotations' }
BoundMethod class >> ___annotationsOf___: aFunction ifNotAssigned: aBlock [
	"What ``f.__annotations__'' answers for aFunction, a function that keeps its
	attributes in dynamic instVars: the dict an assignment cached, or what an
	ASSIGNED __annotate__ computes -- None answers an empty dict, a callable is
	called with Format.VALUE and must answer a dict (function___annotations___
	get, Objects/funcobject.c) -- cached as CPython caches it.  With nothing
	assigned, aBlock answers the compiled annotations, uncached: a module
	function can sit in committed globals, and a read that cached would be a
	write on every first read there."

	| annotate annotations |
	(aFunction dynamicInstVarAt: #'__annotations__') ifNotNil: [:cached | ^ cached].
	annotate := aFunction dynamicInstVarAt: #'__annotate__'.
	annotate isNil ifTrue: [^ aBlock value].
	annotations := annotate == None
		ifTrue: [(Python at: #'PyDict') new]
		ifFalse: [self ___annotationsComputedBy___: annotate].
	aFunction dynamicInstVarAt: #'__annotations__' put: annotations.
	^ annotations

]

{ #category : 'Grail-Python Names' }
BoundMethod class >> ___callableTypeAttributeFor___: aTypeName [
	"The types-module name of the class CPython calls aTypeName, for
	___callableTypeNamed___:.  Anything else Grail implements natively is a
	builtin_function_or_method."

	#( #('function' #FunctionType) #('method' #MethodType)
		#('method-wrapper' #MethodWrapperType) #('method_descriptor' #MethodDescriptorType)
		#('wrapper_descriptor' #WrapperDescriptorType) )
			do: [:pair | (pair at: 1) = aTypeName ifTrue: [^ pair at: 2]].
	^ #BuiltinFunctionType

]

{ #category : 'Grail-Annotations' }
BoundMethod class >> ___checkAnnotationWrite___: aSymbol value: aValue [
	"The setters' refusals for the two PEP 649 names, which every kind of
	function shares (function___annotate___set_impl and
	function___annotations___set_impl, Objects/funcobject.c): __annotate__ takes
	None or a callable, __annotations__ None or a dict.  Grail took anything, so
	``f.__annotate__ = 42'' was stored and called later."

	aSymbol == #'__annotate__' ifTrue: [
		(aValue == None or: [((Python at: #builtins) ___instance___) @env1:callable: aValue])
			ifFalse: [TypeError @env1:___signal___: '__annotate__ must be callable or None']].
	aSymbol == #'__annotations__' ifTrue: [
		(aValue == None or: [aValue isKindOf: KeyValueDictionary])
			ifFalse: [TypeError @env1:___signal___: '__annotations__ must be set to a dict object']]

]

{ #category : 'Grail-Attribute Access' }
BoundMethod class >> ___checkFunctionAttrWritable___: attrName writing: aValue [
	"CPython's func_set_* guards, which Grail had none of: EVERY write to a
	function attribute was accepted, including the ones that leave the object
	incoherent.  ``f.__name__ = 7'' put an integer where every traceback, repr
	and pickle expects a string; ``f.__code__ = 7'' replaced the code object
	with a number; ``f.__closure__ = ()'' discarded the cells the body reads.
	None of it raised, and the damage surfaced later, somewhere else.

	Two kinds of rule, and CPython uses a DIFFERENT exception for each, so
	they are not interchangeable:

	  * READ-ONLY (__closure__, __globals__, __builtins__) -> AttributeError,
	    because the attribute has no setter at all;
	  * TYPE-CHECKED (__name__, __qualname__, __code__, __defaults__,
	    __kwdefaults__, __dict__) -> TypeError, because there IS a setter and
	    the value was the wrong shape.

	``__class__'' is a TypeError too: a function's layout is fixed, and CPython
	refuses with ``__class__ assignment only supported for mutable types''.

	Lives on BoundMethod because that is the class a MODULE-LEVEL ``def'' is
	in Grail -- which is what Python calls a function.  A closure is an
	ExecBlock, a KERNEL class whose Grail extensions are filed into the shared
	extent by install_base.sh rather than per user, so it is left alone here;
	closures keep the old permissive behaviour and are called out in the tests."

	| sym pyClass |
	"The type classes are looked up at RUNTIME rather than named as compile-time
	globals: BoundMethod.gs is filed BEFORE Tuple.gs and PyDict.gs, so naming
	them directly is an ``undefined symbol'' at install time.  A class that
	cannot be resolved skips its check rather than failing the write."
	pyClass := [:n | Python @env0:at: n otherwise: nil].
	sym := attrName asSymbol.
	((self ___readOnlyFunctionAttrNames___) includes: sym) ifTrue: [
		AttributeError @env1:___signal___:
			('attribute ''' , sym asString , ''' of ''function'' objects is not writable')].
	sym == #'__class__' ifTrue: [
		TypeError @env1:___signal___:
			'__class__ assignment only supported for mutable types or ModuleType subclasses'].
	(sym == #'__name__' or: [sym == #'__qualname__']) ifTrue: [
		(aValue isKindOf: CharacterCollection) ifFalse: [
			TypeError @env1:___signal___: (sym asString , ' must be set to a string object')]].
	sym == #'__defaults__' ifTrue: [
		self
			___requireNoneOr___: aValue
			kind: (pyClass value: #'tuple')
			message: '__defaults__ must be set to a tuple object'].
	sym == #'__kwdefaults__' ifTrue: [
		self
			___requireNoneOr___: aValue
			kind: (pyClass value: #'PyDict')
			message: '__kwdefaults__ must be set to a dict object'].
	sym == #'__dict__' ifTrue: [
		| d bcls |
		d := pyClass value: #'PyDict'.
		(d notNil and: [(aValue isKindOf: d) not]) ifTrue: [
			"CPython names the offending type in this one, and so does the
			closure path in ExecBlockAttrs -- the same rule reported two
			different ways read as two different rules."
			bcls := pyClass value: #'bytes'.
			TypeError @env1:___signal___: (bcls isNil
				ifTrue: ['__dict__ must be set to a dictionary']
				ifFalse: ['__dict__ must be set to a dictionary, not a '''
					, (bcls @env1:___pyTypeNameOf___: aValue) , ''''])]].
	sym == #'__code__' ifTrue: [
		| c |
		c := pyClass value: #'PyCode'.
		(c notNil and: [(aValue isKindOf: c) not]) ifTrue: [
			TypeError @env1:___signal___: '__code__ must be set to a code object']].
	self ___checkAnnotationWrite___: sym value: aValue.
	^ self

]

{ #category : 'Grail-Annotations' }
BoundMethod class >> ___deleteAnnotationsOf___: aFunction [
	"``del f.__annotations__'': the dict goes and so does __annotate__, which then
	reads None -- never an error, as CPython's setter takes a NULL like a None."

	self ___dropAnnotationsOf___: aFunction.
	aFunction dynamicInstVarAt: #'__annotate__' put: None

]

{ #category : 'Grail-Annotations' }
BoundMethod class >> ___dropAnnotationsOf___: aFunction [
	"Forget the dict aFunction's __annotations__ cached, so the next read
	computes it again."

	(aFunction dynamicInstVarAt: #'__annotations__') isNil ifFalse: [
		aFunction removeDynamicInstVar: #'__annotations__']

]

{ #category : 'Grail-Attribute Access' }
BoundMethod class >> ___methodDescriptorNames___ [
	"The names the METHOD type itself exposes, as against ones it merely
	forwards.  CPython's method object carries __func__, __self__ and __doc__
	as read-only descriptors, so assigning to them is ``attribute 'X' of
	'method' objects is not writable'' -- an attribute that is there and has no
	setter.  Any other name is ``no attribute 'X' and no __dict__ for setting
	new attributes'', which is a different complaint and a different message."

	^ #( #'__func__' #'__self__' #'__doc__' )

]

{ #category : 'Grail-Python Attribute Hook' }
BoundMethod class >> ___pythonValueAttrs___ [
	"``__name__'' / ``__qualname__'' / ``__module__'' are Python
	identifying-metadata *value* attributes: ``f.__name__'' is the name
	STRING, not a callable.  Decorators (functools.wraps) and flask's
	``_endpoint_from_view_func'' read ``view_func.__name__'' and key
	``view_functions'' by it.  Without this hook ``___pyAttrLoad___''
	wraps the dunder as a BoundMethod, so the lookup key becomes a
	BoundMethod instead of 'hello' and dispatch KeyErrors.  These
	selectors are answered by the env-1 accessors below."

	^ IdentitySet new
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__func__';
		add: #'__self__';
		add: #'__annotations__';
		add: #'__annotate__';
		add: #'__signature_spec__';
		add: #'__defaults__';
		add: #'__kwdefaults__';
		add: #'__doc__';
		add: #'__text_signature__';
		add: #'__code__';
		add: #'__closure__';
		"``__globals__'' is a value for the same reason ``__closure__'' beside it
		 is: it answers the module's namespace DICT, and without this hook
		 ___pyAttrLoad___ wraps the accessor as a BoundMethod -- measured, before
		 this line, as ``type(top.__globals__).__name__ == 'BoundMethod''' and
		 ``top.__globals__ is globals()'' False, which reads as an identity bug
		 rather than as an attribute that was never evaluated."
		add: #'__globals__';
		"``__builtins__'' answers a namespace DICT too, and needs the hook for
		 the identical reason as ``__globals__'' above: unlisted, the accessor
		 comes back wrapped as a BoundMethod, so ``f.__builtins__ is
		 __builtins__'' is False and the attribute looks broken rather than
		 unevaluated."
		add: #'__type_params__';
		add: #'__builtins__';
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Attribute Access' }
BoundMethod class >> ___readOnlyFunctionAttrNames___ [
	"The FUNCTION attributes CPython exposes with a getter and no setter, so
	that assignment and deletion both answer AttributeError.  test_funcattrs
	checks both directions for each -- its cannot_set_attr helper fails unless
	setattr and delattr each raise."

	^ #( #'__closure__' #'__globals__' #'__builtins__' )

]

{ #category : 'Grail-Attribute Access' }
BoundMethod class >> ___requireNoneOr___: aValue kind: aClassOrNil message: aMessage [
	"aValue must be None/nil or an instance of aClassOrNil.  A nil class means
	the type is not resolvable yet (see ___checkFunctionAttrWritable___), and
	an unresolvable type is not a reason to reject a write."

	aClassOrNil isNil ifTrue: [^ self].
	(aValue isNil or: [aValue == None]) ifTrue: [^ self].
	(aValue isKindOf: aClassOrNil) ifTrue: [^ self].
	^ TypeError @env1:___signal___: aMessage

]

{ #category : 'Grail-Annotations' }
BoundMethod class >> ___setAnnotate___: aValue of: aFunction [
	"``f.__annotate__ = v'', after the write check: a callable drops the cached
	__annotations__, so the next read calls it; None keeps the cache, as
	CPython's setter does."

	aFunction dynamicInstVarAt: #'__annotate__' put: aValue.
	aValue == None ifFalse: [self ___dropAnnotationsOf___: aFunction]

]

{ #category : 'Grail-Annotations' }
BoundMethod class >> ___setAnnotations___: aValue of: aFunction [
	"``f.__annotations__ = d'', after the write check: d is the dict from now on
	and __annotate__ reads None.  None is a delete, as in CPython."

	aValue == None ifTrue: [^ self ___deleteAnnotationsOf___: aFunction].
	aFunction dynamicInstVarAt: #'__annotations__' put: aValue.
	aFunction dynamicInstVarAt: #'__annotate__' put: None

]

{ #category : 'Grail-Python Names' }
BoundMethod >> ___instanceCallableTypeName___ [
	"CPython's type for a method bound to an INSTANCE: ``method'' for a def
	compiled from Python, which has a code object, and otherwise a native
	method -- ``method-wrapper'' for a slot, a bound slot wrapper, and
	``builtin_function_or_method'' for the rest.

	Decided by the METHOD -- whether the class implementing it is one of
	CPython's built-in types (UnboundMethod >> ___isBuiltinTypeMethod___) --
	and not by whether the receiver's class backs a kernel type: ``set().add''
	is set's native method although no kernel class stands behind Grail's set,
	and it was reported as a bound Python method."

	((UnboundMethod @env1:definingClass: receiver class selector: selector)
		___isBuiltinTypeMethod___) ifFalse: [^ 'method'].
	^ self ___isSlotWrapper___
		ifTrue: ['method-wrapper']
		ifFalse: ['builtin_function_or_method']

]

{ #category : 'Grail-Python Names' }
BoundMethod >> ___isSlotWrapper___ [
	"A native slot method: one of UnboundMethod class >> ___slotWrapperNames___
	that the receiver's type does not define as an ordinary method instead."

	^ (UnboundMethod ___slotWrapperNames___ includes: selector)
		and: [(UnboundMethod ___methodDescriptorOverrides___ includes:
			((receiver @env1:__class__) @env1:__name__) asString , '.' , selector) not]

]

{ #category : 'Grail-Private' }
BoundMethod >> _receiverHasSelector: aSymbol [
	"True if the receiver's class chain implements `aSymbol` in env 1.
	Walks ``whichClassIncludesSelector:environmentId:`` so inherited
	methods (e.g. ``values`` on KeyValueDictionary, invoked through
	an IdentityKeyValueDictionary instance) are visible."

	^ ((receiver class) whichClassIncludesSelector: aSymbol environmentId: 1) notNil

]

{ #category : 'Grail-Private' }
BoundMethod >> _selectorForArgCount: nargs [
	"Return the selector for the given arity.  0..3 are precomputed
	at construction time (sel0/sel1/sel2/sel3 — the hot path).
	4..16 are built lazily here; higher arities are rare enough that
	the per-call string concatenation cost is fine — and the lookup
	path tries the varargs form first when defaults are present, so
	this only fires for true fixed-arity calls (Python ``def f(a, b,
	c, d, e, f, g, h, i):'' compiles to ``f:_:_:_:_:_:_:_:_:'').

	NIL past GemStone's 1,024-character Symbol limit, near 512 arguments: no
	method can have that selector, and building it raised an uncatchable
	ImproperOperation (#1540).  Every caller already treats nil as ``no
	fixed-arity form'' and goes on to the varargs one.  The same limit as
	CallAst class >> ___fixedAritySelectorFits___:arity: at compile time."

	| s |
	nargs == 0 ifTrue: [^ sel0].
	nargs == 1 ifTrue: [^ sel1].
	nargs == 2 ifTrue: [^ sel2].
	nargs == 3 ifTrue: [^ sel3].
	nargs < 0 ifTrue: [^ nil].
	selector asString size + 1 + (2 * (nargs - 1)) > 1024 ifTrue: [^ nil].
	"Build ``name:'' followed by ``_:'' repeated (nargs - 1) times."
	s := selector asString , ':'.
	2 to: nargs do: [:_ | s := s , '_:'].
	^ s asSymbol

]

{ #category : 'Grail-Private' }
BoundMethod >> _setDefiningClass: aClass [
	"Record the class an unbound (receiver-less) reference's selector is defined
	on -- the staticmethod-style invocation fallback in value:value:."

	definingClass := aClass

]

{ #category : 'Grail-Private' }
BoundMethod >> _setReceiver: aReceiver selector: aSymbol [
	"Initialize and precompute arity-resolved selectors for arities 0..3
	plus the varargs `_name:kw:` selector. Selector building happens ONCE
	at construction time, not on every call."

	| s |
	receiver := aReceiver.
	selector := aSymbol.
	s := aSymbol asString.
	sel0 := aSymbol.
	sel1 := (s , ':') asSymbol.
	sel2 := (s , ':_:') asSymbol.
	sel3 := (s , ':_:_:') asSymbol.
	selVarargs := ('_' , s , ':kw:') asSymbol.
	"WHEN THIS CAPTURE WAS MADE, so ___pinnedSelectorFor___ can tell a capture
	that PREDATES a pin from a lookup made afterwards.  Pinning by selector alone
	cannot: after ``del D.m'' a fresh ``d.m'' must find the INHERITED method, and
	it has the same selector as the capture that must still find D's.  One class
	variable read and one store, both literal-cheap, on a path that already does
	five symbol constructions."
	pinGeneration := GrailPinGeneration

]

{ #category : 'Grail-Private' }
BoundMethod >> _setStaticExceptionNewOn: aClass [
	"``Exc.__new__'' for a built-in exception class: reads as ``__new__'' bound
	to aClass, but every call reaches BaseException class >>
	___excStaticNew:kw: with the whole argument list, ``cls'' first -- no
	fixed-arity selector is answered, so value:value: takes the varargs one."

	self _setReceiver: aClass selector: #'__new__'.
	sel0 := sel1 := sel2 := sel3 := #'___grailNoFixedArityForStaticNew___'.
	selVarargs := #'___excStaticNew:kw:'

]

{ #category : 'Grail-Comparison' }
BoundMethod >> = other [
	"Smalltalk equality mirrors the Python __eq__ (receiver identity +
	selector) so a BoundMethod works as a Python set/dict key -- Grail's
	set/dict key on Smalltalk =/hash, not on __hash__/__eq__.  BoundMethods
	are transient (minted per attribute access, never stored in a committed
	hashed collection), so overriding hash carries no rehash hazard."

	^ (other isKindOf: BoundMethod)
		and: [receiver == (other receiver) and: [selector == (other selector)]]

]

{ #category : 'Grail-Accessing' }
BoundMethod >> definingClass [
	"The class whose method dictionary a receiver-LESS (unbound) BoundMethod's
	selector is defined on, or nil.  Set only for a class-body plain-def sibling
	referenced as a value (NameAst emits ``receiver: nil ... definingClass:
	<class>''); it lets value:value: invoke the method staticmethod-style when
	the popped receiver's class does not implement the selector (a gnv called as
	_generate_next_value_(name, ...), where name is a plain string).  nil for
	every ordinary BoundMethod -> no behaviour change for them."

	^ definingClass

]

{ #category : 'Grail-Comparison' }
BoundMethod >> hash [
	^ receiver identityHash bitXor: selector hash

]

{ #category : 'Grail-Accessing' }
BoundMethod >> receiver [
	^ receiver

]

{ #category : 'Grail-Accessing' }
BoundMethod >> selector [
	^ selector

]
