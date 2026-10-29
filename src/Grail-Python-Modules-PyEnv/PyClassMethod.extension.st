Extension { #name : 'PyClassMethod' }

{ #category : 'Grail-Instantiation' }
PyClassMethod class >> ___pyCallValue___: positional kw: kwargs [
	"Constructing through the indirect protocol -- see PyStaticMethod."

	^ self value: (positional == nil ifTrue: [#()] ifFalse: [positional])
		value: kwargs

]

{ #category : 'Grail-Reflection' }
PyClassMethod class >> __name__ [
	"Object class's, which answers 'classmethod' for this class from the
	module-attribute identity table and a Python subclass's own name for the
	subclass.  Answering 'classmethod' outright named every subclass so too
	(``class Sub(classmethod): pass'' had __name__ 'classmethod').  Kept, rather than
	removed, only because an env-1 method cannot be (#1727)."

	^ super __name__

]

{ #category : 'Grail-Class-Call Fast Path' }
PyClassMethod class >> __new__ [
	"``classmethod()'' -- CallAst's zero-argument class-call fast path.  The
	inherited allocating __new__ answered a classmethod wrapping NOTHING, whose
	every use then failed far from the call; the class-call entry refuses it
	as cm_init does."

	^ self value: #() value: nil

]

{ #category : 'Grail-Class-Call Fast Path' }
PyClassMethod class >> __new__: fn [
	"``classmethod(fn)'' fixed-arity class-new fast path (see PyStaticMethod)."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: fn.
	^ inst

]

{ #category : 'Grail-Reflection' }
PyClassMethod class >> __qualname__ [
	"Object class's, which answers 'classmethod' for this class from the
	module-attribute identity table and a Python subclass's own name for the
	subclass.  Answering 'classmethod' outright named every subclass so too
	(``class Sub(classmethod): pass'' had __name__ 'classmethod').  Kept, rather than
	removed, only because an env-1 method cannot be (#1727)."

	^ super __qualname__

]

{ #category : 'Grail-Instantiation' }
PyClassMethod class >> value: positional value: keywords [
	"classmethod(f) -- the class-call entry: allocate, then initialize, as
	type.__call__ does.  The callable is __init__'s to set, not __new__'s."

	| instance |
	instance := self ___allocateInstance___: positional kw: keywords.
	instance ___init__: positional kw: keywords.
	^ instance

]

{ #category : 'Grail-Instantiation' }
PyClassMethod >> ___init__: positional kw: keywords [
	"cm_init (Objects/funcobject.c:1487-1497): no keyword, then exactly one
	positional, which becomes the callable.  Both checks used to sit in
	__new__, which let ``classmethod(f, x=1)'' through with the keyword dropped and
	set the callable even for a subclass whose own __init__ never asks for it."

	(keywords @env0:notNil and: [keywords @env0:isEmpty @env0:not]) ifTrue: [
		^ TypeError ___signal___: 'classmethod() takes no keyword arguments'].
	(positional == nil or: [positional @env0:size @env0:~= 1]) ifTrue: [
		^ TypeError ___signal___: 'classmethod expected 1 argument, got '
			@env0:, (positional == nil ifTrue: [0] ifFalse: [positional @env0:size])
				@env0:printString].
	self @env0:dynamicInstVarAt: #'__func__' put: (positional @env0:at: 1).
	^ None

]

{ #category : 'Grail-Instantiation' }
PyClassMethod >> ___new__: positional kw: keywords [
	"Run with the CLASS as receiver (Object >> ___allocateInstance___:kw:).
	classmethod.__new__ is object's: it allocates and ignores its arguments, so an
	instance whose __init__ does not set the callable wraps None
	(test_descr test_classmethod_new)."

	| instance |
	instance := self @env0:new.
	instance @env0:dynamicInstVarAt: #'__func__' put: None.
	^ instance

]

{ #category : 'Grail-Callable' }
PyClassMethod >> ___pyCallValue___: positional kw: kwargs [
	"A classmethod object is NOT callable.  CPython made STATICMETHOD callable in
	3.10 (bpo-43682) and deliberately left classmethod alone, because a
	classmethod has nothing to bind its first argument to until a class supplies
	one.

	Answered as a catchable TypeError rather than left to fall through.  Without
	it the call reached ``doesNotUnderstand: #'__call__''' -- an env-1
	MessageNotUnderstood, which Python cannot catch, so
	``assertRaises(TypeError, wrapper, 1)'' did not fail, it took the whole test
	down as an error."

	^ TypeError ___signal___: '''classmethod'' object is not callable'

]

{ #category : 'Grail-Introspection' }
PyClassMethod >> ___pyHiddenStateNames___ [
	"The callable is Grail's implementation, kept under #__func__, not an
	attribute of the instance dict: CPython's __func__ is a member."

	^ #( #'__func__' )

]

{ #category : 'Grail-Reflection' }
PyClassMethod >> __annotate__ [
	"PEP 649, forwarded for the same reason: functools.update_wrapper copies
	__annotate__ (not __annotations__), so a wrapper built around a
	@classmethod / @staticmethod only inherits annotations if this answers."

	^ self ___wrappedMeta___: #'__annotate__'

]

{ #category : 'Grail-Reflection' }
PyClassMethod >> __annotations__ [
	"Forwarded like __name__ / __doc__: a decorator that inspects the wrapped
	callable's annotations must see them through the wrapper, and
	singledispatchmethod's annotation form infers its dispatch type from them."

	^ self ___wrappedMeta___: #'__annotations__'

]

{ #category : 'Grail-Introspection' }
PyClassMethod >> __class_getitem__: item [
	"``classmethod[int]'' -- a types.GenericAlias, as CPython's classmethod
	answers through its own __class_getitem__.  Grail answered the class
	unchanged.  Run with the CLASS as receiver by Metaclass3 >>
	___grailClassGetitemDispatch___:, as set's is."

	^ (Python @env0:at: #'PyGenericAlias') ___fromSubscript___: item origin: self

]

{ #category : 'Grail-Introspection' }
PyClassMethod >> __dict__ [
	"The instance dict, holding what CPython copies from the callable when the
	wrapper is made (Object >> ___copyWrappedAttributesOf___:).  Copied when
	the dict is first READ instead: Grail settles a function's __qualname__
	only once the class body defining it has run, so a copy made in the body
	kept a short one and shadowed the real one -- functools'
	singledispatchmethod over a classmethod read 'A.cls_func' (test_functools
	test_method_wrapping_attributes)."

	self @env0:___copyWrappedAttributesOf___: (self @env0:dynamicInstVarAt: #'__func__').
	^ super __dict__

]

{ #category : 'Grail-Attribute Access' }
PyClassMethod >> __doc__ [
	^ self ___wrappedMeta___: #'__doc__'

]

{ #category : 'Grail-Descriptor' }
PyClassMethod >> __get__: obj [
	^ self __get__: obj _: None

]

{ #category : 'Grail-Descriptor' }
PyClassMethod >> __get__: obj _: cls [
	"Binds the CLASS, whether reached through the class (obj is None, cls is
	the class) or through an instance (both supplied).  MethodBinding is what
	prepends a receiver to the call arguments.

	With no class, the class is type(obj) (Objects/funcobject.c:1468-1469),
	the PYTHON type: ``classmethod(f).__get__(0)'' binds int, where the
	Smalltalk class would have been SmallInteger.  With neither, CPython's
	wrapper refuses (Objects/typeobject.c:9693-9701)."

	| owner |
	owner := (cls == nil or: [cls == None])
		ifTrue: [(obj == nil or: [obj == None])
			ifTrue: [nil]
			ifFalse: [obj ___pyMetaclass___]]
		ifFalse: [cls].
	owner == nil ifTrue: [
		TypeError ___signal___: '__get__(None, None) is invalid'].
	^ MethodBinding instance: owner
		callable: (self @env0:dynamicInstVarAt: #'__func__')

]

{ #category : 'Grail-Reflection' }
PyClassMethod >> __isabstractmethod__ [
	^ self ___wrappedIsAbstract___

]

{ #category : 'Grail-Attribute Access' }
PyClassMethod >> __module__ [
	^ self ___wrappedMeta___: #'__module__'

]

{ #category : 'Grail-Attribute Access' }
PyClassMethod >> __name__ [
	^ self ___wrappedMeta___: #'__name__'

]

{ #category : 'Grail-Attribute Access' }
PyClassMethod >> __qualname__ [
	^ self ___wrappedMeta___: #'__qualname__'

]

{ #category : 'Grail-Reflection' }
PyClassMethod >> __repr__ [
	^ self ___wrapperRepr___: 'classmethod'

]

{ #category : 'Grail-Attribute Access' }
PyClassMethod >> __wrapped__ [
	^ self @env0:dynamicInstVarAt: #'__func__'

]

{ #category : 'Grail-Callable' }
PyClassMethod >> value: positional value: kwargs [
	"The other call entry point, refusing for the same reason -- both have to,
	or which one a caller happens to reach decides whether the refusal is
	catchable."

	^ TypeError ___signal___: '''classmethod'' object is not callable'

]
