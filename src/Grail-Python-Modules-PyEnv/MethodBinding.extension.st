Extension { #name : 'MethodBinding' }

{ #category : 'Grail-Reflection' }
MethodBinding class >> __module__ [
	"``type(a.meth).__module__''.  CPython's bound-method type is
	``builtins.method'', so 'builtins' is the honest answer for Grail's generic
	binding.

	Class-side because the instance-side __module__ below forwards to the wrapped
	callable: reading __module__ on the CLASS found that instance method and
	wrapped it as an UnboundMethod, so ``type(a.meth).__module__'' answered a
	callable rather than any module name.

	Known divergence: for a bound singledispatchmethod CPython answers
	'functools', because its __get__ returns a functools-specific wrapper rather
	than a generic bound method.  Grail returns a MethodBinding for every bound
	access, so test_method_wrapping_attributes still fails on that one assertion
	-- claiming 'functools' here would be wrong for every other bound method."

	^ 'builtins'

]

{ #category : 'Grail-Reflection' }
MethodBinding class >> __qualname__ [
	^ 'method'

]

{ #category : 'Grail-Instance Creation' }
MethodBinding class >> instance: anInstance callable: aCallable [
	"Create a MethodBinding that prepends ``anInstance'' to its
	positional arguments and forwards to ``aCallable''.  ``aCallable''
	is typically a BoundMethod (from a top-level def) or an ExecBlock
	(from a lambda or nested def closure)."

	| inst |
	inst := self @env0:new.
	inst @env0:_setInstance: anInstance callable: aCallable.
	^ inst

]

{ #category : 'Grail-Attribute Access' }
MethodBinding >> ___boundMeta___: aName [
	"Read aName off the bound callable through the Python attribute protocol,
	raising AttributeError when it has none -- the same answer an unbound read
	would give, so both access paths agree."

	^ (self @env0:callable) @env1:___pyAttrLoad___: aName

]

{ #category : 'Grail-Callable' }
MethodBinding >> ___pyCallValue___: positional kw: kwargs [
	"Forward the Python ``f(args, **kw)'' call site to the
	descriptor-bound dispatch."

	^ self value: positional value: kwargs

]

{ #category : 'Grail-Attribute Access' }
MethodBinding >> __annotations__ [
	^ self ___boundMeta___: #'__annotations__'

]

{ #category : 'Grail-Callable' }
MethodBinding >> __call__: positional [
	"Make MethodBinding respond to Python''s ``callable(...)'' protocol.
	Forwards to the varargs entry point with empty kwargs."

	^ self value: positional value: nil

]

{ #category : 'Grail-Reflection' }
MethodBinding >> __defaults__ [
	"The callable's -- binding a first argument does not change which trailing
	parameters have defaults."

	^ [callable @env1:___pyAttrLoad___: #'__defaults__']
		@env0:on: AbstractException do: [:e | e @env0:return: ExecBlock @env0:___pyNone___]

]

{ #category : 'Grail-Attribute Access' }
MethodBinding >> __doc__ [
	"The wrapped callable's docstring.  Without this the read fell through to
	Object's own __doc__ and a bound method claimed to be documented as ``The
	base class of the class hierarchy...''."

	^ self ___boundMeta___: #'__doc__'

]

{ #category : 'Grail-Reflection' }
MethodBinding >> __func__ [
	"The underlying callable, the companion of __self__ on a bound method."

	^ callable

]

{ #category : 'Grail-Attribute Access' }
MethodBinding >> __getattr__: aName [
	"Forward any attribute the binding itself does not define to the wrapped
	callable.  A bound method in CPython exposes the underlying function's
	attributes, and code relies on it: an lru_cache-wrapped METHOD reached
	through an instance answers ``a.f.cache_info()'' / ``cache_clear()'' --
	django.utils.functional does the latter -- and those live on the wrapper,
	not on the binding.

	Raises AttributeError when the callable has none either, so a genuine typo
	still reports as one."

	^ (self @env0:callable) @env1:___pyAttrLoad___: aName @env0:asString @env0:asSymbol

]

{ #category : 'Grail-Reflection' }
MethodBinding >> __kwdefaults__ [
	^ [callable @env1:___pyAttrLoad___: #'__kwdefaults__']
		@env0:on: AbstractException do: [:e | e @env0:return: ExecBlock @env0:___pyNone___]

]

{ #category : 'Grail-Attribute Access' }
MethodBinding >> __module__ [
	^ self ___boundMeta___: #'__module__'

]

{ #category : 'Grail-Attribute Access' }
MethodBinding >> __name__ [
	^ self ___boundMeta___: #'__name__'

]

{ #category : 'Grail-Attribute Access' }
MethodBinding >> __qualname__ [
	^ self ___boundMeta___: #'__qualname__'

]

{ #category : 'Grail-Printing' }
MethodBinding >> __repr__ [
	"A callable ASSIGNED into a class body and then read off an instance --
	``repr_str = repr_string'' -- which Grail binds through this class rather
	than through BoundMethod.  CPython does not distinguish the two: both are
	type ``method'' and both print the bound-method form, so this prints it too.

	The instance''''s repr propagates if it raises, as BoundMethod''''s does and
	as CPython does."

	| q |
	q := [(self __qualname__) @env0:asString]
		@env0:on: AbstractException do: [:ex | ex @env0:return: (self __name__) @env0:asString].
	^ ('<bound method ' @env0:, q @env0:, ' of ' @env0:,
		(instance @env1:__repr__) @env0:asString
		@env0:, '>') @env0:asUnicodeString

]

{ #category : 'Grail-Reflection' }
MethodBinding >> __self__ [
	"Python's bound-method ``m.__self__'' -- the receiver this binding
	prepends.  A MethodBinding exists only where something WAS bound, so
	answering it is unconditional; the unbound cases never produce one.
	functools.partialmethod is the discriminator that makes that true: over a
	@staticmethod its __get__ answers the partialmethod itself rather than a
	binding, so ``A.static'' and ``a.static'' still have no __self__, and a
	plain partialmethod read off the CLASS is likewise handed back raw."

	^ instance

]

{ #category : 'Grail-Reflection' }
MethodBinding >> __signature_spec__ [
	"The callable's def-time parameter spec WITHOUT its first positional
	parameter -- the one this binding supplies.  CPython's signature() of a
	bound method drops it; this forwarded the function's spec whole, so a
	classmethod bound through ``classmethod.__get__'' read as ``(cls, v)''
	rather than ``(v)''.  pydantic picks a validator's calling convention by
	counting those parameters, and so called every classmethod field
	validator with an extra info argument.

	A leading *args is not dropped: it absorbs the binding, as in CPython."

	| spec first |
	spec := [callable @env1:___pyAttrLoad___: #'__signature_spec__']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	(spec == nil or: [spec == None or: [spec @env0:isEmpty]])
		ifTrue: [^ ExecBlock @env0:___pyNone___].
	first := spec @env0:at: 1.
	(((first @env0:at: 2) @env0:= 0) or: [(first @env0:at: 2) @env0:= 1])
		ifFalse: [^ spec].
	^ spec @env0:copyFrom: 2 to: spec @env0:size

]

{ #category : 'Grail-Calling' }
MethodBinding >> value: positional value: kwargs [
	"Prepend the bound instance to ``positional'' and forward the call
	to the underlying callable.  Mirrors CPython''s bound-method
	semantics: ``f = cls.method; f(c, x)'' is the same as
	``c.method(x)'' — the wrapper handles the latter by inserting c."

	| newPositional |
	newPositional := { instance } @env0:, positional.
	^ callable ___pyCallValue___: newPositional kw: kwargs

]
