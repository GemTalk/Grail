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
	"Object class's, which answers 'staticmethod' for this class from the
	module-attribute identity table and a Python subclass's own name for the
	subclass.  Answering 'staticmethod' outright named every subclass so too
	(``class Sub(staticmethod): pass'' had __name__ 'staticmethod').  Kept, rather than
	removed, only because an env-1 method cannot be (#1727)."

	^ super __name__

]

{ #category : 'Grail-Class-Call Fast Path' }
PyStaticMethod class >> __new__ [
	"``staticmethod()'' -- CallAst's zero-argument class-call fast path.  The
	inherited allocating __new__ answered a staticmethod wrapping NOTHING, whose
	every use then failed far from the call; the class-call entry refuses it
	as sm_init does."

	^ self value: #() value: nil

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
	"Object class's, which answers 'staticmethod' for this class from the
	module-attribute identity table and a Python subclass's own name for the
	subclass.  Answering 'staticmethod' outright named every subclass so too
	(``class Sub(staticmethod): pass'' had __name__ 'staticmethod').  Kept, rather than
	removed, only because an env-1 method cannot be (#1727)."

	^ super __qualname__

]

{ #category : 'Grail-Instantiation' }
PyStaticMethod class >> value: positional value: keywords [
	"staticmethod(f) -- the class-call entry: allocate, then initialize, as
	type.__call__ does.  The callable is __init__'s to set, not __new__'s."

	| instance |
	instance := self ___allocateInstance___: positional kw: keywords.
	instance ___init__: positional kw: keywords.
	^ instance

]

{ #category : 'Grail-Instantiation' }
PyStaticMethod >> ___init__: positional kw: keywords [
	"sm_init (Objects/funcobject.c:1731-1741): no keyword, then exactly one
	positional, which becomes the callable.  Both checks used to sit in
	__new__, which let ``staticmethod(f, x=1)'' through with the keyword dropped and
	set the callable even for a subclass whose own __init__ never asks for it."

	(keywords @env0:notNil and: [keywords @env0:isEmpty @env0:not]) ifTrue: [
		^ TypeError ___signal___: 'staticmethod() takes no keyword arguments'].
	(positional == nil or: [positional @env0:size @env0:~= 1]) ifTrue: [
		^ TypeError ___signal___: 'staticmethod expected 1 argument, got '
			@env0:, (positional == nil ifTrue: [0] ifFalse: [positional @env0:size])
				@env0:printString].
	self @env0:dynamicInstVarAt: #'__func__' put: (positional @env0:at: 1).
	^ None

]

{ #category : 'Grail-Instantiation' }
PyStaticMethod >> ___new__: positional kw: keywords [
	"Run with the CLASS as receiver (Object >> ___allocateInstance___:kw:).
	staticmethod.__new__ is object's: it allocates and ignores its arguments, so an
	instance whose __init__ does not set the callable wraps None
	(test_descr test_staticmethod_new)."

	| instance |
	instance := self @env0:new.
	instance @env0:dynamicInstVarAt: #'__func__' put: None.
	^ instance

]

{ #category : 'Grail-Callable' }
PyStaticMethod >> ___pyCallValue___: positional kw: kwargs [
	"CPython 3.10+ made staticmethod objects callable, so
	``staticmethod(f)(x)'' works without going through a class."

	^ (self @env0:dynamicInstVarAt: #'__func__')
		___pyCallValue___: positional kw: kwargs

]

{ #category : 'Grail-Introspection' }
PyStaticMethod >> ___pyHiddenStateNames___ [
	"The callable is Grail's implementation, kept under #__func__, not an
	attribute of the instance dict: CPython's __func__ is a member."

	^ #( #'__func__' )

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

{ #category : 'Grail-Introspection' }
PyStaticMethod >> __class_getitem__: item [
	"``staticmethod[int]'' -- a types.GenericAlias, as CPython's staticmethod
	answers through its own __class_getitem__.  Grail answered the class
	unchanged.  Run with the CLASS as receiver by Metaclass3 >>
	___grailClassGetitemDispatch___:, as set's is."

	^ (Python @env0:at: #'PyGenericAlias') ___fromSubscript___: item origin: self

]

{ #category : 'Grail-Introspection' }
PyStaticMethod >> __dict__ [
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
