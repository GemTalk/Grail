Extension { #name : 'functools_singledispatchmethod' }

{ #category : 'Grail-Instance Creation' }
functools_singledispatchmethod class >> ___on: aFunc [

	| inst |
	inst := self ___new___.
	inst @env0:dynamicInstVarAt: #func put: aFunc.
	inst @env0:dynamicInstVarAt: #dispatcher
		put: (functools_singledispatch ___on: aFunc).
	^ inst

]

{ #category : 'Grail-Reflection' }
functools_singledispatchmethod class >> __module__ [
	"``type(meth).__module__'' -- the module the DESCRIPTOR CLASS lives in, which
	is functools, not the module that defined the decorated method.  Same
	class-side pattern functools_partial uses.

	Needed because the instance-side __module__ below delegates to the wrapped
	function: reading __module__ on the CLASS found that instance method and
	wrapped it as an UnboundMethod, so ``type(meth).__module__'' answered a
	callable instead of 'functools'."

	^ 'functools'

]

{ #category : 'Grail-Reflection' }
functools_singledispatchmethod class >> __qualname__ [
	^ 'singledispatchmethod'

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod >> ___classSideOwner___ [
	"The class this class-side method was defined on -- the receiver of the
	BoundMethod the class-body decorator handed us -- or nil."

	| fn recv recorded |
	"Recorded by __set_name__ when the class was built.  Needed because the
	wrapped callable does not always know its class: a decorator that returns a
	@classmethod hands this object a PyClassMethod, which carries no owner, and
	then the class-side call had nothing to bind against (``'PyClassMethod' object
	is not callable'')."
	recorded := self @env0:dynamicInstVarAt: #'___owner___'.
	(recorded @env0:notNil and: [recorded @env0:isKindOf: Behavior])
		ifTrue: [^ recorded].
	fn := self @env0:dynamicInstVarAt: #func.
	(fn @env0:isKindOf: BoundMethod) ifFalse: [^ nil].
	recv := fn @env0:receiver.
	^ (recv @env0:isKindOf: Behavior) ifTrue: [recv] ifFalse: [nil]

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod >> ___dispatchName___ [
	"The decorated method's name, for the arity error."

	^ [(self @env0:dynamicInstVarAt: #func) __name__ @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: 'singledispatchmethod method']

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod >> ___isClassSideDescriptor___: anImpl [
	"Is anImpl a @classmethod / @staticmethod descriptor that still needs its
	owner bound?  Deliberately narrow: a plain function or method handle also
	answers __get__:_:, and those already receive the argument array unchanged."

	| syms cm sm |
	syms := System @env0:myUserProfile @env0:symbolList.
	cm := syms @env0:objectNamed: #'PyClassMethod'.
	(cm @env0:notNil and: [anImpl @env0:isKindOf: cm]) ifTrue: [^ true].
	sm := syms @env0:objectNamed: #'PyStaticMethod'.
	^ sm @env0:notNil and: [anImpl @env0:isKindOf: sm]

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> ___isClassSideHandle___: fn depth: aDepth [
	"Is fn a class-side handle, possibly behind wrappers?

	``@singledispatchmethod @classmethod @contextmanager def m(cls, arg)'' hands
	this class the contextmanager's factory, not the class-side handle -- so the
	direct test called it a plain method, expected an instance in front of the
	dispatch argument, and raised ``helper requires at least 1 positional
	argument'' for a call that had supplied everything.

	Follow ``__wrapped__'', which is what functools.wraps sets and what CPython's
	own contextmanager leaves behind.  Bounded depth, so a wrapper that somehow
	points at itself cannot spin."

	| wrapped |
	fn == nil ifTrue: [^ false].
	aDepth @env0:> 4 ifTrue: [^ false].
	((fn isKindOf: BoundMethod) and: [fn @env0:receiver isKindOf: Behavior])
		ifTrue: [^ true].
	"A @classmethod / @staticmethod DESCRIPTOR is class-side by definition, and a
	decorator that returns one puts it here directly rather than behind a
	__wrapped__ hop (``@singledispatchmethod @classmethod_friendly_decorator
	@classmethod def m'')."
	(self ___isClassSideDescriptor___: fn) ifTrue: [^ true].
	wrapped := [fn @env1:___pyAttrLoad___: #'__wrapped__']
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil].
	(wrapped == nil or: [wrapped == fn]) ifTrue: [^ false].
	^ self ___isClassSideHandle___: wrapped depth: aDepth @env0:+ 1

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> ___pyBindsSelf___ [
	"Marker read by object >> ___isDescriptorCallable___:.  CPython makes this
	a descriptor whose __get__ returns a wrapper bound to the instance; Grail
	reaches the same place through its own class-attribute binding, so
	``a.t(0)'' arrives here as (a, 0).

	NOT for a wrapped @classmethod / @staticmethod.  CPython's __get__
	delegates to the wrapped descriptor's own __get__, and neither of those
	binds the instance: ``a.static_func(0)'' and ``A.static_func(0)'' both call
	the function with just (0), and a classmethod gets ``cls'' either way.
	Refusing the binding here makes both access paths deliver the identical
	argument array, which is what lets one call shape serve all three kinds."

	"Now ALWAYS false.  Binding moved to the descriptor protocol: object >>
	___isValueDescriptor___: asks this marker precisely so a wrapper that
	declines can fall through to __get__, and __get__ answers a
	functools_singledispatchmethod_get, which is what gives ``A.m'' and
	``a.m'' CPython's distinct reprs and puts type(a.m) in functools instead
	of a generic MethodBinding in builtins.

	The argument-shape property described above did not go away -- it moved:
	singledispatchmethod_get >> ___pyCallValue___ prepends the instance
	exactly when ___wrapsClassSideMethod___ says the descriptor binds one, so
	one call shape still serves all three kinds."
	^ false

]

{ #category : 'Grail-Callable' }
functools_singledispatchmethod >> ___pyCallValue___: positional kw: kwargs [
	"``a.t(arg, ...)'' -- dispatch on the type of the first argument AFTER the
	receiver, then run the winning implementation with the receiver back in
	front.

	One rule covers both access paths.  Read through an INSTANCE the receiver
	was prepended by the binding, so it is positional[1] and the dispatch
	argument is positional[2]; read through the CLASS (``A.t(a, 0)'', the
	unbound function CPython hands back) the caller passes the receiver
	explicitly in the same slot.  Either way the implementation is called with
	the array unchanged -- registered implementations are ``def _(self, arg)''
	and take the receiver first.

	A wrapped @classmethod / @staticmethod carries no receiver in the array at
	all (___pyBindsSelf___ declines the binding, and the implementation is a
	BoundMethod that supplies the class itself), so for those the dispatch
	argument is the first element."

	| impl at |
	at := self ___wrapsClassSideMethod___ ifTrue: [1] ifFalse: [2].
	positional @env0:size @env0:< at ifTrue: [
		"CPython names the FUNCTION: ``t requires at least 1 positional
		argument''.  The receiver does not count -- ``A().t()'' and
		``A().t(a=1)'' both raise, though the first already has one element
		in the array here."
		TypeError ___signal___: (self ___dispatchName___)
			@env0:, ' requires at least 1 positional argument'].
	impl := (self @env0:dynamicInstVarAt: #dispatcher)
		dispatch: (positional @env0:at: at) @env0:class.
	"A registered implementation that is itself a @classmethod / @staticmethod
	arrives as the bare descriptor: ``@A.t.register(int)'' over ``@classmethod
	def _(cls, arg)'' registers a PyClassMethod, which no class owns because the
	registration happens after the class is built.  Calling it directly passed
	the dispatch argument as ``cls'' and left ``arg'' unfilled -- ``TypeError:
	missing required argument: arg''.

	The BASE implementation never showed this: the class-body decorator hands
	singledispatchmethod a BoundMethod that already supplies the class, which is
	what ___wrapsClassSideMethod___ reads.  Bind the registered one the same way,
	through its own __get__, against that same owning class.  A PyStaticMethod's
	__get__ answers the function unbound, which is equally correct for it."
	(self ___wrapsClassSideMethod___
		and: [self ___isClassSideDescriptor___: impl]) ifTrue: [
			| owner |
			owner := self ___classSideOwner___.
			owner == nil ifFalse: [
				^ (impl __get__: (ExecBlock @env0:___pyNone___) _: owner)
					___pyCallValue___: positional kw: kwargs]].
	^ impl ___pyCallValue___: positional kw: kwargs

]

{ #category : 'Grail-Representation' }
functools_singledispatchmethod >> ___reprLabel___ [
	"``__qualname__'', else ``__name__'', else ``?'' -- the name CPython's
	singledispatchmethod repr uses for the wrapped callable.

	Both names are read through the Python ATTRIBUTE PROTOCOL rather than
	sent as messages.  A direct send only finds a compiled method, which is
	what an ExecBlock has, so it worked for an ordinary def and silently
	fell through to ``?'' for any other callable -- including the one the
	fallback exists for, an instance of a class that assigns ``__name__''
	in its body:

		class CallableWithName:
			__name__ = 'NOQUALNAME'
			def __call__(self, *args): pass

	That name lives in the class dictionary, reachable via ___pyAttrLoad___:
	and not by ``aReceiver __name__''."

	| func label |
	func := self @env0:dynamicInstVarAt: #func.
	"``self __qualname__'', not the wrapped callable's: it qualifies a
	class-side BoundMethod as ``Cls.meth'' from the receiver it is bound to,
	which is what the @classmethod / @staticmethod cases depend on."
	label := [self __qualname__ @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil].
	label @env0:isNil ifTrue: [
		label := [(func @env1:___pyAttrLoad___: #'__name__') @env0:asString]
			@env0:on: AbstractException
			do: [:ex | ex @env0:return: '?']].
	^ label

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> ___wrapsClassSideMethod___ [
	"Is the decorated method a @classmethod / @staticmethod rather than a
	plain instance method?

	Grail compiles those onto the metaclass, and the class-body decorator
	hands this class a BoundMethod on the CLASS for them (see FunctionDefAst >>
	___decoratorBaseIsClassSide___) against an UnboundMethod for a plain
	method.  That is the same distinction CPython draws -- there the wrapped
	object is a classmethod/staticmethod descriptor instead of a plain
	function -- so the handle's kind is the honest signal, not a flag threaded
	down from the parser.

	The receiver must be a CLASS: a BoundMethod on a MODULE is a plain
	top-level function (``singledispatchmethod(some_function)''), which binds
	an instance like any other function would."

	| fn |
	fn := self @env0:dynamicInstVarAt: #func.
	^ self ___isClassSideHandle___: fn depth: 0

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> __annotations__ [
	^ (self @env0:dynamicInstVarAt: #func) __annotations__

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> __doc__ [
	^ (self @env0:dynamicInstVarAt: #func) __doc__

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> __get__: obj _: cls [
	"Python's descriptor read.  Both of Grail's hooks land here now:
	object >> ___classDescriptorGet___: passes (None, cls) for ``A.m'' and
	___descriptorGet___: passes (instance, class) for ``a.m''.  Answering a
	distinct object for each is what makes the three CPython access paths
	three different things -- the descriptor, the unbound read and the bound
	read -- which is the whole subject of test_method_repr."

	^ functools_singledispatchmethod_get ___on: self obj: obj cls: cls

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> __isabstractmethod__ [
	"CPython: ``getattr(self.func, '__isabstractmethod__', False)'' -- so an
	abstract method stays abstract through the decorator and ABCMeta still
	refuses to instantiate the class."

	^ [((self @env0:dynamicInstVarAt: #func)
		___pyAttrLoad___: #'__isabstractmethod__') == true]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: false]

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> __module__ [
	^ (self @env0:dynamicInstVarAt: #func) __module__

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> __name__ [
	^ (self @env0:dynamicInstVarAt: #func) __name__

]

{ #category : 'Grail-Attribute Access' }
functools_singledispatchmethod >> __qualname__ [
	"``Cls.meth''.  An UnboundMethod already qualifies itself; a class-side
	BoundMethod answers the bare selector, so qualify it here from the receiver
	it is bound to -- which for these IS the defining class.

	That receiver's __qualname__, not its Smalltalk ``name'': a class defined in
	a function is ``TestSingleDispatch.test_method_repr.<locals>.A'', and
	test_method_repr builds its expected repr out of ``A.__qualname__'' -- so a
	label built from the bare name only agreed while Grail could not see lexical
	nesting on either side of the comparison."

	| fn cls owner |
	fn := self @env0:dynamicInstVarAt: #func.
	"A @classmethod / @staticmethod DESCRIPTOR -- what the class body now hands
	an outer decorator -- forwards __qualname__ to the function it wraps,
	which is already qualified."
	((fn @env0:isKindOf: BoundMethod)
		and: [fn @env0:receiver @env0:isKindOf: Behavior])
		ifFalse: [^ fn @env1:___pyAttrLoad___: #'__qualname__'].
	self ___wrapsClassSideMethod___ ifTrue: [
		cls := fn @env0:receiver.
		owner := [(cls __qualname__) @env0:asString]
			@env0:on: AbstractException
			do: [:ex | ex @env0:return: cls @env0:name @env0:asString].
		^ (owner @env0:, '.' @env0:, fn @env0:selector @env0:asString)
			@env0:asUnicodeString].
	^ fn __qualname__

]

{ #category : 'Grail-Representation' }
functools_singledispatchmethod >> __repr__ [
	"CPython: ``<single dispatch method descriptor Cls.meth>'', naming the
	wrapped callable by __qualname__, then __name__, then ``?'' when it
	carries neither."

	^ ('<single dispatch method descriptor ' @env0:, self ___reprLabel___ @env0:, '>')
		@env0:asUnicodeString

]

{ #category : 'Grail-Descriptor' }
functools_singledispatchmethod >> __set_name__: owner _: aName [
	"Python's __set_name__, sent for every class-body entry as the class is
	built.  Recording the owner is what lets a class-side dispatch bind against
	the defining class when the wrapped callable cannot name it -- see
	___classSideOwner___."

	(owner @env0:isKindOf: Behavior) ifTrue: [
		self @env0:dynamicInstVarAt: #'___owner___' put: owner].
	^ ExecBlock @env0:___pyNone___

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod >> _register: positional kw: kwargs [

	^ (self @env0:dynamicInstVarAt: #dispatcher) _register: positional kw: kwargs

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod >> dispatcher [
	^ self @env0:dynamicInstVarAt: #dispatcher

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod >> register: clsOrFunc [
	"``@t.register(int)'' and the annotation form ``@t.register'' -- both
	delegate to the underlying generic function, which owns the registry."

	^ (self @env0:dynamicInstVarAt: #dispatcher) register: clsOrFunc

]

{ #category : 'Grail-Single Dispatch' }
functools_singledispatchmethod >> register: cls _: aFunc [
	"``t.register(cls, impl)'' direct form."

	^ (self @env0:dynamicInstVarAt: #dispatcher) register: cls _: aFunc

]

{ #category : 'Grail-Callable' }
functools_singledispatchmethod >> value: positional value: kwargs [
	"Called DIRECTLY rather than through a binding -- ``A.t(0)'' reads the
	descriptor off the class and calls it, which routes through
	PythonInstance >> value:value: instead of ___pyCallValue___:kw:.  That is
	the normal path for the @classmethod / @staticmethod forms, where nothing
	binds an instance."

	^ self ___pyCallValue___: positional kw: kwargs

]
