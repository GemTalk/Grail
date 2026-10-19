Extension { #name : 'PyClassMethod' }

{ #category : 'Grail-Instantiation' }
PyClassMethod class >> ___pyCallValue___: positional kw: kwargs [
	"Constructing through the indirect protocol -- see PyStaticMethod."

	^ self value: (positional == nil ifTrue: [#()] ifFalse: [positional])
		value: kwargs

]

{ #category : 'Grail-Reflection' }
PyClassMethod class >> __name__ [
	^ 'classmethod'

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
	^ 'classmethod'

]

{ #category : 'Grail-Instantiation' }
PyClassMethod class >> value: positional value: keywords [
	"classmethod(f) -- the class-call entry."

	^ self ___allocateInstance___: positional kw: keywords

]

{ #category : 'Grail-Instantiation' }
PyClassMethod >> ___new__: positional kw: keywords [
	| inst |
	(positional == nil or: [positional @env0:size @env0:~= 1]) ifTrue: [
		TypeError ___signal___: 'classmethod expected 1 argument, got '
			@env0:, (positional == nil ifTrue: [0] ifFalse: [positional @env0:size])
				@env0:printString].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: (positional @env0:at: 1).
	^ inst

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
	prepends a receiver to the call arguments."

	| owner |
	owner := (cls == nil or: [cls == None])
		ifTrue: [(obj == nil or: [obj == None])
			ifTrue: [nil]
			ifFalse: [obj @env0:class]]
		ifFalse: [cls].
	owner == nil ifTrue: [
		TypeError ___signal___:
			'classmethod descriptor needs an owner class to bind'].
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
