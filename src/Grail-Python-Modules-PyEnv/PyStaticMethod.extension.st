Extension { #name : 'PyStaticMethod' }

{ #category : 'Grail-Instantiation' }
PyStaticMethod class >> ___pyCallValue___: positional kw: kwargs [
	"The indirect protocol, which is how a class-body decorator reaches the
	class.  See functools_cached_property for why this is opt-in per class
	rather than answered for every class on ``object''."

	^ self value: (positional == nil ifTrue: [#()] ifFalse: [positional])
		value: kwargs

]

{ #category : 'Grail-Reflection' }
PyStaticMethod class >> __name__ [
	^ 'staticmethod'

]

{ #category : 'Grail-Class-Call Fast Path' }
PyStaticMethod class >> __new__: fn [
	"``staticmethod(fn)'' fixed-arity class-new fast path -- CallAst emits
	``(staticmethod @env1:__new__: f)'' now that the bare name resolves to this
	CLASS (so ``type(staticmethod(f)) is staticmethod'').  Mirrors ___new__:kw:."

	| inst |
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: fn.
	^ inst

]

{ #category : 'Grail-Reflection' }
PyStaticMethod class >> __qualname__ [
	^ 'staticmethod'

]

{ #category : 'Grail-Instantiation' }
PyStaticMethod class >> value: positional value: keywords [
	"staticmethod(f) -- the class-call entry."

	^ self ___allocateInstance___: positional kw: keywords

]

{ #category : 'Grail-Instantiation' }
PyStaticMethod >> ___new__: positional kw: keywords [
	| inst |
	(positional == nil or: [positional @env0:size @env0:~= 1]) ifTrue: [
		TypeError ___signal___: 'staticmethod expected 1 argument, got '
			@env0:, (positional == nil ifTrue: [0] ifFalse: [positional @env0:size])
				@env0:printString].
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'__func__' put: (positional @env0:at: 1).
	^ inst

]

{ #category : 'Grail-Callable' }
PyStaticMethod >> ___pyCallValue___: positional kw: kwargs [
	"CPython 3.10+ made staticmethod objects callable, so
	``staticmethod(f)(x)'' works without going through a class."

	^ (self @env0:dynamicInstVarAt: #'__func__')
		___pyCallValue___: positional kw: kwargs

]

{ #category : 'Grail-Reflection' }
PyStaticMethod >> __annotate__ [
	"PEP 649, forwarded for the same reason: functools.update_wrapper copies
	__annotate__ (not __annotations__), so a wrapper built around a
	@classmethod / @staticmethod only inherits annotations if this answers."

	^ self ___wrappedMeta___: #'__annotate__'

]

{ #category : 'Grail-Reflection' }
PyStaticMethod >> __annotations__ [
	"Forwarded like __name__ / __doc__: a decorator that inspects the wrapped
	callable's annotations must see them through the wrapper, and
	singledispatchmethod's annotation form infers its dispatch type from them."

	^ self ___wrappedMeta___: #'__annotations__'

]

{ #category : 'Grail-Attribute Access' }
PyStaticMethod >> __doc__ [
	^ self ___wrappedMeta___: #'__doc__'

]

{ #category : 'Grail-Descriptor' }
PyStaticMethod >> __get__: obj [
	^ self @env0:dynamicInstVarAt: #'__func__'

]

{ #category : 'Grail-Descriptor' }
PyStaticMethod >> __get__: obj _: cls [
	"Never binds -- that is the whole point of a static method."

	^ self @env0:dynamicInstVarAt: #'__func__'

]

{ #category : 'Grail-Reflection' }
PyStaticMethod >> __isabstractmethod__ [
	"abc reads this with getattr on every class-body entry, so it has to
	answer rather than raise, and it must report what it WRAPS."

	^ self ___wrappedIsAbstract___

]

{ #category : 'Grail-Attribute Access' }
PyStaticMethod >> __module__ [
	"Forwarded like __name__ / __qualname__ / __doc__: the wrapper reports the
	identity of what it wraps, and CPython's staticmethod copies __module__ among
	them.  Missing entirely, so ``getattr(wrapper, '__module__')'' raised."

	^ self ___wrappedMeta___: #'__module__'

]

{ #category : 'Grail-Attribute Access' }
PyStaticMethod >> __name__ [
	^ self ___wrappedMeta___: #'__name__'

]

{ #category : 'Grail-Attribute Access' }
PyStaticMethod >> __qualname__ [
	^ self ___wrappedMeta___: #'__qualname__'

]

{ #category : 'Grail-Reflection' }
PyStaticMethod >> __repr__ [
	"CPython names the WRAPPED callable: ``<staticmethod(<function f at 0x...>)>''.
	``<staticmethod object>'' told a reader nothing about which function this
	wraps, which is the only interesting thing about a wrapper, and
	test_decorators asserts the form."

	^ self ___wrapperRepr___: 'staticmethod'

]

{ #category : 'Grail-Attribute Access' }
PyStaticMethod >> __wrapped__ [
	"CPython exposes the wrapped callable under BOTH names: ``__func__'' is the
	descriptor protocol's spelling, ``__wrapped__'' is the one the introspection
	tools use -- inspect.signature follows it, and functools.wraps sets it.  Grail
	had only the first, so anything that unwrapped generically saw a wrapper it
	could not look through."

	^ self @env0:dynamicInstVarAt: #'__func__'

]

{ #category : 'Grail-Callable' }
PyStaticMethod >> value: positional value: kwargs [
	^ (self @env0:dynamicInstVarAt: #'__func__')
		___pyCallValue___: positional kw: kwargs

]
