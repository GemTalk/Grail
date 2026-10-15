Extension { #name : 'functools_singledispatchmethod_get' }

{ #category : 'Grail-Instance Creation' }
functools_singledispatchmethod_get class >> ___on: aDescriptor obj: anObj cls: aCls [
	"Metadata is copied into DYNAMIC INSTVARS here, not served by instance-side
	__name__ / __module__ / ... methods.

	___pyAttrLoad___: probes the dynamic-instVar store first and answers what it
	finds as a VALUE, but an instance-side dunder METHOD reaches the generic
	branch and comes back wrapped as a BoundMethod -- only a CLASS receiver gets
	these read as values.  Defining them as methods therefore made
	``meth.__module__'' answer <BoundMethod object>; __doc__ alone worked,
	because object >> ___pyAttrLoad___: special-cases it.  The descriptor itself
	carries its metadata the same way, which is why reading it off the
	descriptor already worked.

	CPython stamps __module__ and __doc__ in __init__ for the same class of
	reason (they ``conflict with type descriptors'') and resolves the rest in
	__getattr__.  Grail copies all of them: the wrapper is built fresh on every
	attribute read, so a snapshot cannot go stale."

	| inst |
	inst := self ___new___.
	inst @env0:dynamicInstVarAt: #unbound put: aDescriptor.
	inst @env0:dynamicInstVarAt: #obj put: anObj.
	inst @env0:dynamicInstVarAt: #cls put: aCls.
	#( #'__name__' #'__qualname__' #'__module__' #'__doc__'
	   #'__annotations__' #'__isabstractmethod__' #'__type_params__' )
		@env0:do: [:each |
			| v |
			v := inst ___forwardAttr___: each.
			v == nil ifFalse: [inst @env0:dynamicInstVarAt: each put: v]].
	"__wrapped__ is stored, not served by a method, for the same reason: an
	instance-side dunder method comes back BoundMethod-wrapped."
	inst @env0:dynamicInstVarAt: #'__wrapped__'
		put: inst ___wrappedCallable___.
	^ inst

]

{ #category : 'Grail-Reflection' }
functools_singledispatchmethod_get class >> __module__ [
	"``type(a.m).__module__'' must be 'functools' -- asserted by
	test_method_wrapping_attributes for all six access paths.  A generic
	MethodBinding used to serve the bound plain-method case and reported
	'builtins'."

	^ 'functools'

]

{ #category : 'Grail-Reflection' }
functools_singledispatchmethod_get class >> __name__ [
	^ '_singledispatchmethod_get'

]

{ #category : 'Grail-Reflection' }
functools_singledispatchmethod_get class >> __qualname__ [
	^ '_singledispatchmethod_get'

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod_get >> ___boundInstance___ [
	"The instance this was read through, or nil/None for a class read."

	| obj |
	obj := self @env0:dynamicInstVarAt: #obj.
	^ (obj == nil or: [obj == None]) ifTrue: [nil] ifFalse: [obj]

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod_get >> ___forwardAttr___: aSym [
	"Metadata is FORWARDED to the descriptor, not copied.  The descriptor
	already resolves each of these off whatever it wraps -- a plain def, a
	@classmethod, a callable object -- so copying them here would be a second
	place to keep correct.

	Read off the WRAPPED CALLABLE through the attribute protocol -- CPython's
	``getattr(self._unbound.func, name)'' -- rather than by sending the
	descriptor's own __name__ / __qualname__ accessors.

	Those accessors send __name__ DIRECTLY to what they wrap, which is an
	uncatchable env-1 MessageNotUnderstood for a callable that has none.
	``singledispatchmethod(SomeCallable())'' is exactly that case and
	test_method_repr covers it, expecting the label to degrade to __name__ and
	then to ``?''.  ___pyAttrLoad___: raises a catchable AttributeError
	instead, so a missing name answers nil here and the repr falls back.

	__annotations__ is the exception: the descriptor's own accessor is the one
	that answers the right dict (it sends __annotations__ to the wrapped
	callable, which resolves through the wrapper chain), where the attribute
	protocol answers a dict missing the parameters -- a KeyError on the
	subscript the test does.  Tried under a broad guard, since it too is a
	direct send and the callable may have nothing to answer."

	| f viaDescriptor |
	f := self ___unbound___ @env0:dynamicInstVarAt: #func.
	f == nil ifTrue: [^ nil].
	aSym == #'__annotations__' ifTrue: [
		viaDescriptor := [self ___unbound___ __annotations__]
			@env0:on: AbstractException
			do: [:ex | ex @env0:return: nil].
		viaDescriptor == nil ifFalse: [^ viaDescriptor]].
	^ [f ___pyAttrLoad___: aSym]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil]

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod_get >> ___pyCallValue___: positional kw: kwargs [
	"Delegate the call to the descriptor, prepending the instance exactly
	when the descriptor says it binds one.

	A @classmethod or @staticmethod takes the SAME argument array through
	either access path -- ``a.static_func(0)'' and ``A.static_func(0)'' both
	reach the function as (0) -- so the prepend is conditional on
	___wrapsClassSideMethod___ rather than merely on an instance being
	present.  That is the property the old ___pyBindsSelf___ arrangement
	provided, and several passing tests depend on it."

	| obj args |
	obj := self ___boundInstance___.
	args := (obj == nil or: [self ___unbound___ ___wrapsClassSideMethod___])
		ifTrue: [positional]
		ifFalse: [(Array @env0:with: obj) @env0:, positional].
	^ self ___unbound___ ___pyCallValue___: args kw: kwargs

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod_get >> ___unbound___ [
	"The singledispatchmethod descriptor this was read from."

	^ self @env0:dynamicInstVarAt: #unbound

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod_get >> ___wrappedCallable___ [
	"What CPython exposes as __wrapped__, and what inspect.signature follows to
	report the real parameter list.

	There it is the plain FUNCTION -- so the signature includes ``self'', and
	test_method_signatures asserts exactly that for both the class and the
	instance read.  Grail's closest analogue is the UNBOUND handle: the
	class-body decorator hands the descriptor a BoundMethod, whose spec is
	bound-shaped and therefore missing the receiver.  Answer the interned
	UnboundMethod for the same method instead, which reports the whole
	parameter list.

	Stored into a dynamic instVar by the constructor rather than served from
	here: an instance-side dunder METHOD comes back BoundMethod-wrapped from the
	attribute protocol -- the same trap __module__ and friends hit."

	| fn cls |
	fn := self ___unbound___ @env0:dynamicInstVarAt: #func.
	(fn @env0:isKindOf: BoundMethod) ifTrue: [
		cls := fn @env0:receiver.
		(cls @env0:isKindOf: Behavior) ifFalse: [cls := fn @env0:definingClass].
		(cls @env0:isKindOf: Behavior) ifTrue: [
			^ UnboundMethod definingClass: cls selector: fn @env0:selector]].
	^ fn

]

{ #category : 'Grail-Representation' }
functools_singledispatchmethod_get >> __repr__ [
	"Two of CPython's three forms live here, and test_method_repr asserts
	each verbatim: an unbound read is ``<single dispatch method NAME>'' and a
	bound read ``<bound single dispatch method NAME of OBJ>''.  The third,
	``<single dispatch method descriptor NAME>'', belongs to the descriptor
	itself (below)."

	| obj label |
	label := self ___unbound___ ___reprLabel___.
	obj := self ___boundInstance___.
	^ (obj == nil
		ifTrue: ['<single dispatch method ' @env0:, label @env0:, '>']
		ifFalse: ['<bound single dispatch method ' @env0:, label
			@env0:, ' of ' @env0:, (obj __repr__) @env0:asString @env0:, '>'])
				@env0:asUnicodeString

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod_get >> _register: positional kw: kwargs [
	"Varargs companion of register, for the two-argument and keyword forms."

	^ self ___unbound___ _register: positional kw: kwargs

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod_get >> register: clsOrFunc [
	"CPython exposes ``register'' on the read object too, so
	``A.m.register(int)'' works and not only the same call reached through the
	class dict entry."

	^ self ___unbound___ register: clsOrFunc

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod_get >> value: positional value: kwargs [
	"Two-argument block protocol, as the descriptor also answers."

	^ self ___pyCallValue___: positional kw: kwargs

]
