"Callable shim for ``SomeClass.instance_method' accessed via the class —
an *unbound* method (a plain function in Python 3).  Returned by
``object >> ___pyAttrLoad___' when a Behavior (class) receiver loads a name
that resolves to an *instance* method.

Holds:
  * definingClass — the class whose method to run (looked up INCLUSIVE of
                    itself and its superclass chain — unlike ``Super',
                    which starts at the parent).
  * selector      — the requested attribute symbol (Python name).
  * attrDict      — nil until ``Cls.m.__dict__ = d' REPLACES the mapping, then
                    the dict itself.  A real instVar rather than a dynamic one
                    so it stays out of the PyInstanceDict view it is standing in
                    for.
  * dictView      — the live view, made once and kept, so that ``m.__dict__ is
                    m.__dict__'' holds the way CPython's does.

``value:value:' substitutes the FIRST positional argument as the receiver
(the explicit ``self') and runs definingClass's own method on it via the
env-0 ``performMethod:' primitives — i.e. ``ParentClass.__init__(self,
*args, **kwargs)' invokes ParentClass's ``__init__' on ``self'
NON-virtually (no re-dispatch through ``self''s class, which would
re-fire an override).  This is the explicit-super-init / unbound-method
pattern (flask's ``Environment.__init__' calls
``BaseEnvironment.__init__(self, **options)')."
Class {
	#name : 'UnboundMethod',
	#superclass : 'Object',
	#instVars : [
		'definingClass',
		'selector',
		'attrDict',
		'dictView',
		'pinGeneration'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Names' }
UnboundMethod class >> ___methodDescriptorOverrides___ [
	"Slot names a built-in type ALSO defines as an ordinary method, which is
	then what its __dict__ holds (METH_COEXIST): ``dict.__getitem__'' is a
	method descriptor, ``object.__repr__'' a slot wrapper."

	^ #('dict.__getitem__' 'dict.__contains__' 'list.__getitem__' 'set.__contains__'
		'frozenset.__contains__')

]

{ #category : 'Grail-Calling' }
UnboundMethod class >> ___noReceiver___ [
	"The receiver ``Cls.f(...)'' runs a RECEIVERLESS def against: one whose
	declared parameters do not start with a name Grail strips into the
	Smalltalk receiver, such as ``def f(*a)'' and ``def f(*, x)''.

	CPython calls ``Cls.f(1, 2)'' as the plain function, so ``a'' is (1, 2).
	Grail compiles ``def f(*a)'' with ``a := {self} , positional'' -- right
	for ``obj.f(2)'', where CPython's ``a'' is (obj, 2) -- so the unbound call
	runs it with this object as the receiver, and the body leaves it out of
	``a'' (FunctionDefAst's *vararg binding, text and IR alike).

	A literal no Python code can reach, so no argument can be mistaken for it."

	^ #( #'___grailNoReceiver___' )

]

{ #category : 'Grail-Python Names' }
UnboundMethod class >> ___pyDisplayNameOf___: aSelector forClass: aClass [
	"The name a PRIVATE method was WRITTEN with, or nil.

	CPython mangles a private def's BINDING and keeps its __name__ as written:
	``def __m'' in class C is reached as C._C__m and reports __name__ '__m' and
	__qualname__ 'C.__m'.  A Grail method object holds only its selector, which
	is the binding, so it reported '_C__m'.

	NOT recovered by un-mangling the selector.  A def WRITTEN as ``_C__lit''
	has exactly the spelling a mangled ``__lit'' would have, and CPython reports
	it as written; stripping the prefix would rename it.  So the defining class
	records the pairs it actually mangled (ClassDefAst emits
	___pyMangledDefNames___), and a name absent from every table is its own
	spelling.  Walks the superclass chain, reading each class's OWN table, so an
	inherited private method reports the name its defining class gave it.

	Cheap on the common path: a selector that cannot be a mangled name -- it
	must start with exactly one underscore and contain ``__'' -- never walks."

	| s sym c |
	aClass isNil ifTrue: [^ nil].
	s := aSelector asString.
	"A property ACCESSOR compiled under a private selector -- a deleter as
	``___propDeleter_x'', a decorated property's setter as ``___propSetter_x''
	(ClassDefAst >> ___redirectedAccessorNameFor___:) -- was written ``def x''.
	Only ClassDefAst emits either prefix, so stripping it renames nothing
	written by hand, and a decorator's functools.wraps then copies the name
	CPython would (test_warnings DeprecatedTests.test_property)."
	#('___propSetter_' '___propDeleter_') do: [:prefix |
		(s size > prefix size and: [(s copyFrom: 1 to: prefix size) = prefix])
			ifTrue: [
				| rest |
				rest := s copyFrom: prefix size + 1 to: s size.
				^ (self ___pyDisplayNameOf___: rest forClass: aClass) ifNil: [rest]]].
	(s size > 3 and: [(s at: 1) == $_ and: [(s at: 2) ~~ $_]]) ifFalse: [^ nil].
	(s indexOfSubCollection: '__' startingAt: 3) = 0 ifTrue: [^ nil].
	sym := s asSymbol.
	c := (aClass isKindOf: Behavior) ifTrue: [aClass] ifFalse: [aClass class].
	[c notNil] whileTrue: [
		(c class compiledMethodAt: #'___pyMangledDefNames___' environmentId: 1 otherwise: nil) notNil
			ifTrue: [ | pairs |
				pairs := [c @env1:___pyMangledDefNames___]
					on: AbstractException do: [:ex | ex return: #()].
				1 to: pairs size - 1 by: 2 do: [:i |
					(pairs at: i) == sym ifTrue: [^ pairs at: i + 1]]].
		c := c superclass].
	^ nil

]

{ #category : 'Grail-Python Attribute Hook' }
UnboundMethod class >> ___pythonValueAttrs___ [
	"``__name__'' / ``__qualname__'' / ``__module__'' are identifying-metadata
	VALUE attributes -- name strings, not callables.  Without this hook
	___pyAttrLoad___ reaches its BoundMethod wrap and answers a callable
	around the accessor, so functools.wraps would copy a BoundMethod as the
	wrapper's __name__ instead of the string.  Mirrors BoundMethod's hook."

	^ IdentitySet new
		add: #'__name__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__objclass__';
		add: #'__annotations__';
		add: #'__annotate__';
		add: #'__signature_spec__';
		add: #'__defaults__';
		add: #'__kwdefaults__';
		add: #'__doc__';
		add: #'__code__';
		add: #'__closure__';
		"``__globals__'' is a value like ``__closure__'' beside it: it answers the
		 defining module's namespace DICT.  Without this line ___pyAttrLoad___
		 wraps the accessor and ``Cls.m.__globals__ is globals()'' is False about
		 a correctly resolved namespace -- an attribute that was never evaluated,
		 presenting as an identity bug."
		add: #'__globals__';
		"``__builtins__'' is a namespace DICT too and needs the hook for the same
		 reason as ``__globals__'' above -- unlisted, the accessor comes back
		 wrapped as a BoundMethod and the identity check fails."
		add: #'__type_params__';
		add: #'__builtins__';
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Calling' }
UnboundMethod class >> ___refuseReceiver___: aReceiver positional: positional kw: kwargs kwonly: kwonlyNames qualifiedName: aName [
	"The opening statement of a class-body def that declares no positional
	parameter and no *vararg -- ``def h()'', ``def ko(*, x=3)'', or such a
	@classmethod (issue #1434).

	Grail strips a def's first declared parameter into the Smalltalk receiver,
	and such a def has none to strip, so the receiver used to be dropped:
	``C().h()'' answered where CPython raises, because the instance is a
	positional argument the def does not take.  The receiver is what tells the
	two calls apart.  A call with no receiver at all, ``C.h()'', runs the def
	against ___noReceiver___ (UnboundMethod >> ___callReceiverless___:kw:orSignal:);
	ANY other receiver is an instance -- or, for a @classmethod, the class --
	that CPython would have passed as the first argument.

	The count includes that receiver, which the def's own arity check cannot see:
	``positional'' is what the packed form was handed besides it, and the unary
	form has neither argument, so both are nil there.  The wording is CPython's,
	the keyword-only clause included."

	| given kg |
	aReceiver == self ___noReceiver___ ifTrue: [^ self].
	given := 1 + (positional == nil ifTrue: [0] ifFalse: [positional size]).
	kg := 0.
	kwargs == nil ifFalse: [
		kwargs keysDo: [:k |
			(kwonlyNames includes: k asString) ifTrue: [kg := kg + 1]]].
	^ TypeError @env1:___signal___: aName , '() takes 0 positional arguments but ' , given printString ,
		(kg > 0
			ifTrue: [' positional argument' , (given > 1 ifTrue: ['s'] ifFalse: ['']) ,
				' (and ' , kg printString , ' keyword-only argument' , (kg > 1 ifTrue: ['s'] ifFalse: ['']) ,
				') were given']
			ifFalse: [given > 1 ifTrue: [' were given'] ifFalse: [' was given']])

]

{ #category : 'Grail-Python Names' }
UnboundMethod class >> ___slotWrapperNames___ [
	"The special methods a built-in type exposes as SLOT WRAPPERS rather than
	as method descriptors: every name in CPython's slotdefs table that has a
	wrapper function (Objects/typeobject.c:10952-11149), which leaves out
	__getattr__ and __new__.  The two kinds word their refusals differently."

	^ #(#'__abs__' #'__add__' #'__aiter__' #'__and__' #'__anext__'
		#'__await__' #'__bool__' #'__buffer__' #'__call__' #'__contains__'
		#'__del__' #'__delattr__' #'__delete__' #'__delitem__' #'__divmod__'
		#'__eq__' #'__float__' #'__floordiv__' #'__ge__' #'__get__'
		#'__getattribute__' #'__getitem__' #'__gt__' #'__hash__' #'__iadd__'
		#'__iand__' #'__ifloordiv__' #'__ilshift__' #'__imatmul__' #'__imod__'
		#'__imul__' #'__index__' #'__init__' #'__int__' #'__invert__' #'__ior__'
		#'__ipow__' #'__irshift__' #'__isub__' #'__iter__' #'__itruediv__'
		#'__ixor__' #'__le__' #'__len__' #'__lshift__' #'__lt__' #'__matmul__'
		#'__mod__' #'__mul__' #'__ne__' #'__neg__' #'__next__' #'__or__'
		#'__pos__' #'__pow__' #'__radd__' #'__rand__' #'__rdivmod__'
		#'__release_buffer__' #'__repr__' #'__rfloordiv__' #'__rlshift__'
		#'__rmatmul__' #'__rmod__' #'__rmul__' #'__ror__' #'__rpow__'
		#'__rrshift__' #'__rshift__' #'__rsub__' #'__rtruediv__' #'__rxor__'
		#'__set__' #'__setattr__' #'__setitem__' #'__str__' #'__sub__'
		#'__truediv__' #'__xor__')

]

{ #category : 'Grail-Python Names' }
UnboundMethod >> ___descriptorQualifiedName___ [

	^ self ___descriptorTypeName___ , '.' , selector

]

{ #category : 'Grail-Python Names' }
UnboundMethod >> ___descriptorTypeName___ [
	"The built-in type this method belongs to, as CPython names it in a
	descriptor's refusals: the prefix of its qualified name, and ``type'' for
	Behavior, which holds what CPython keeps in type's own dict."

	| qualifiedName suffix |
	definingClass == Behavior ifTrue: [^ 'type'].
	qualifiedName := (self @env1:__qualname__) asString.
	suffix := '.' , selector.
	(qualifiedName size > suffix size and: [qualifiedName endsWith: suffix])
		ifFalse: [^ (definingClass @env1:__name__) asString].
	^ qualifiedName copyFrom: 1 to: qualifiedName size - suffix size

]

{ #category : 'Grail-Python Names' }
UnboundMethod >> ___isSlotWrapper___ [

	^ (self class ___slotWrapperNames___ includes: selector)
		and: [(self class ___methodDescriptorOverrides___ includes: self ___descriptorQualifiedName___) not]

]

{ #category : 'Grail-Calling' }
UnboundMethod >> ___signalMissingParameters___ [
	"The plain function's own refusal: every positional parameter without a
	default is missing, the receiver's among them.

	With NO signature to read, the old refusal stands, which claims nothing
	about parameters.  That is the zero-parameter def capturing an enclosing
	method's self, which CPython runs and Grail deliberately does not
	(SuperPreconditionErrorsTestCase >>
	testAZeroParameterMethodCapturingSelfIsStillRefused)."

	| specification names |
	specification := self @env1:__signature_spec__.
	(specification isKindOf: Array) ifFalse: [
		^ TypeError @env1:___signal___: 'unbound method ''' , selector
			, ''' must be called with an instance as the first argument'].
	names := (specification select: [:each | each size = 2 and: [(each at: 2) <= 1]])
		collect: [:each | each at: 1].
	^ BaseException @env1:___signalMissingArguments___: names
		kind: 'positional'
		qualifiedName: (self @env1:__qualname__) asString

]

{ #category : 'Grail-Calling' }
UnboundMethod >> ___signalMissingReceiver___ [
	"``Cls.f()'' with no argument, in CPython's words.  A def in a Python class
	body is a plain function missing its parameters (Python/ceval.c:1386,
	format_missing); a built-in type's method is a descriptor that needs an
	argument (Objects/descrobject.c:267-283 method_check_args, and :536
	wrapperdescr_call for a slot wrapper).  Both used to be Python 2's
	``unbound method 'f' must be called with an instance as the first
	argument''."

	(self @env1:___isPythonClass___: self @env1:___pyOwnerClass___)
		ifTrue: [^ self ___signalMissingParameters___].
	self ___isSlotWrapper___ ifTrue: [
		^ TypeError @env1:___signal___: 'descriptor ''' , selector , ''' of '''
			, self ___descriptorTypeName___ , ''' object needs an argument'].
	^ TypeError @env1:___signal___: 'unbound method ' , self ___descriptorQualifiedName___
		, '() needs an argument'

]

{ #category : 'Grail-Calling' }
UnboundMethod >> ___signalUnresolvedFor___: obj kw: keywords [
	"No method took ``Cls.f(obj, ...)''.  A Python class keeps the
	AttributeError.  A built-in type's descriptor refuses a receiver of
	another type, and otherwise the call's shape: a keyword it takes none of,
	as CPython's method_check_args does first (Objects/descrobject.c:267-290),
	or the count.  All three used to be ``type object 'set' has no method
	'add'''."

	(self @env1:___isPythonClass___: self @env1:___pyOwnerClass___) ifTrue: [
		^ AttributeError @env1:___signal___: 'type object ''' , definingClass name asString
			, ''' has no method ''' , selector , ''''].
	(obj isKindOf: definingClass) ifFalse: [^ self @env1:___signalDescriptorMismatch___: obj].
	(keywords notNil and: [keywords isEmpty not]) ifTrue: [
		^ TypeError @env1:___signal___: self ___descriptorQualifiedName___
			, '() takes no keyword arguments'].
	^ TypeError @env1:___signal___: self ___descriptorQualifiedName___
		, '() takes a different number of arguments'

]

{ #category : 'Grail-Private' }
UnboundMethod >> _boxedNumberRootFor: obj [
	"The boxed base -- AbstractPyInt or AbstractPyFloat -- that obj is an instance
	of, when this handle names the sealed kernel class the base stands in for;
	nil otherwise.  See _resolutionRootFor:."

	| boxed |
	((definingClass == Integer)
		or: [definingClass == SmallInteger or: [definingClass == LargeInteger]])
		ifTrue: [
			boxed := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'AbstractPyInt'.
			(boxed @env0:notNil and: [obj @env0:isKindOf: boxed]) ifTrue: [^ boxed]].
	((definingClass == Float)
		or: [definingClass == SmallDouble or: [definingClass == BinaryFloat]])
		ifTrue: [
			boxed := System @env0:myUserProfile @env0:symbolList
				@env0:objectNamed: #'AbstractPyFloat'.
			(boxed @env0:notNil and: [obj @env0:isKindOf: boxed]) ifTrue: [^ boxed]].
	^ nil

]

{ #category : 'Grail-Dispatch' }
UnboundMethod >> _isFixedArityForwarder: aSelector on: aClass [
	"True when aClass's aSelector is one of the fixed-arity trampolines
	ClassDefAst generates for a varargs def, rather than a method somebody
	wrote.  Told apart by CATEGORY, which is how the rest of Grail tells
	generated companions from real methods -- ___pyAttrLoad___ uses the same
	trick to keep an arity-0 forwarder from reading as a property getter."

	^ [(aClass categoryOfSelector: aSelector environmentId: 1) asString
		= 'Grail-Fixed Arity Forwarders']
			on: AbstractException do: [:ex | ex return: false]

]

{ #category : 'Grail-Private' }
UnboundMethod >> _resolutionRootFor: obj [
	"``int.__repr__(x)'' where x is an int SUBCLASS instance.

	Class.gs's ___subclass___ cannot root a Python int subclass at Integer --
	GemStone seals it, and SmallInteger/LargeInteger are immediate/byte-format
	with no room for instance variables -- so it substitutes AbstractPyInt, a
	Number sibling carrying the integer in a ``value'' slot.  float does the
	same with AbstractPyFloat.  That substitution happens at class-creation
	time; this handle still names the sealed kernel class, so performing its
	method NON-virtually on a boxed receiver ran Integer's code against an
	object that is not an Integer.  It did not fail loudly -- it fell through
	to Smalltalk's printString, so test_enum's
	``int.__repr__(NamedInt('test', 5))'' answered ``aNamedInt''.

	Resolve from the boxed base instead, which publishes the same protocol
	(AbstractPyInt >> __repr__, __str__, __eq__, ...) against ``value''.
	Deliberately the BASE and not ``obj class'': starting at the receiver's own
	class would make the call VIRTUAL, and NamedInt defines a __repr__ whose
	body is exactly ``int.__repr__(self)'' -- that recurses until the stack
	dies.

	str is deliberately absent: Class.gs leaves a plain ``class X(str)'' a
	byte-format Unicode7 subclass (boxing it broke framework str types), so
	its content already IS the string and the kernel method applies as-is."

	(obj @env0:isKindOf: definingClass) ifTrue: [^ definingClass].
	(self _boxedNumberRootFor: obj) @env0:ifNotNil: [:boxed | ^ boxed].
	"A C TYPE reaches Grail as a ShimForeignObject, not a Behavior, and
	answers the class reflection methods itself (ShimForeignObject>>
	__subclasses__): ``type.__subclasses__(T)'' ran Behavior's on the proxy,
	whose ``subclasses'' was an uncatchable MessageNotUnderstood."
	(definingClass == Behavior and: [obj @env0:isKindOf: ShimForeignObject])
		ifTrue: [^ ShimForeignObject].
	^ definingClass

]

{ #category : 'Grail-Private' }
UnboundMethod >> _resolveMethodNargs: nargs kwOk: kwOk from: rootClass [
	"The method this handle names, walking rootClass's chain -- see
	_resolveMethodNargs:kwOk:from:prefix:."

	^ self _resolveMethodNargs: nargs kwOk: kwOk from: rootClass prefix: ''

]

{ #category : 'Grail-Private' }
UnboundMethod >> _resolveMethodNargs: nargs kwOk: kwOk from: rootClass prefix: aPrefix [
	"Walk rootClass's chain INCLUSIVE and return the method from the
	CLOSEST class that publishes a usable form.  Checking per-class (rather
	than scanning the whole chain for the fixed form, then the whole chain
	for varargs) keeps a class's own varargs ``_name:kw:'' from being
	shadowed by an inherited fixed-arity default — notably the env-1 no-op
	``object >> __init__'', which would otherwise swallow a subclass's real
	``___init__:kw:''.  Within a class: when kwargs are present only varargs
	can accept them, so try it first; otherwise prefer the exact fixed
	arity, then fall back to varargs."

	| fixedSel vaSel walker |
	"BUILT FOR ANY ARITY.  This was a table of four cases -- 0, 1, 2, 3 --
	answering nil for everything above, and nil meant ``no fixed form
	exists'', so a call with FOUR OR MORE arguments skipped straight to the
	varargs branch below.

	That is not a missing optimisation, it is the exact failure the
	forwarder guard further down exists to prevent.  The varargs form a
	class publishes is often the fixed-arity FORWARDER's target, and the
	forwarder re-sends VIRTUALLY -- so an unbound call resolved that way
	lands on the SUBCLASS override rather than on the class that was asked:

	    Base.m4(sub, 1, 2, 3, 4)   answered 'S4', Sub's override
	    Base.m3(sub, 1, 2, 3)      answered 'B3', correctly

	and the ordinary way to write an explicit parent call --
	``def m4(self, a, b, c, d): return Base.m4(self, a, b, c, d)'' --
	therefore recursed until the stack died at four arguments while working
	at three (AlmostOutOfStackError).  The guard below had been protecting
	arities 1..3 and nothing else.

	The shape is uniform, so it is generated rather than enumerated: one
	colon for the first argument and ``_:'' for each one after it.

	A selector that is ALREADY a keyword of exactly this arity is complete,
	not a base name: a property's fset handle is on the setter ``name:'', so
	``fset(obj, v)'' looked for ``name::'' and every
	``C.__dict__['p'].__set__'' / ``.fset'' raised AttributeError.  The
	handle stays on the setter itself -- its __isabstractmethod__ must be
	the SETTER's, which test_abc's abstract-property cases read.  A Python
	name never contains a colon, so ordinary handles cannot match."
	fixedSel := (nargs > 0 and: [selector numArgs = nargs])
		ifTrue: [selector]
		ifFalse: [nargs = 0
		ifTrue: [selector]
		ifFalse: [ | ws |
			ws := WriteStream on: String new.
			ws nextPutAll: selector asString; nextPut: $:.
			2 to: nargs do: [:ignored | ws nextPutAll: '_:'].
			ws contents asSymbol]].
	vaSel := ('_' , selector asString , ':kw:') asSymbol.
	"aPrefix names a renamed copy of the method -- ``___grailOrig_'' finds the
	original a ``del'' or a rebinding kept (___grailDeletedOriginalNargs:kwOk:)
	-- and is prepended to each selector as the copier prepends it."
	aPrefix isEmpty ifFalse: [
		fixedSel notNil ifTrue: [fixedSel := (aPrefix , fixedSel asString) asSymbol].
		vaSel := (aPrefix , vaSel asString) asSymbol].
	walker := rootClass.
	[walker notNil] whileTrue: [
		| fixedArityMethod varargsMethod |
		"EACH CLASS IS ASKED FOR THE TWO SELECTORS, not for its merged
		``methodDictForEnv: 1''.  That copy is rebuilt from the persistent and
		session dictionaries on every call, for every class in the chain, and
		growing it runs a primitive (``_selectedPrimeGreaterThan:limit:'').  A
		deep Python recursion through an unbound call -- ``C.__repr__ =
		C.__str__'' whose __str__ calls repr(self) -- reached the stack limit
		inside that primitive, and GemStone cannot unwind an
		AlmostOutOfStackError across a C frame: the session died with
		UncontinuableError 2758 where CPython raises RecursionError
		(test_descr test_repr_as_str).  compiledMethodAt:environmentId:otherwise:
		looks in the session dictionary and then the persistent one, which is
		the membership the merged copy answered."
		fixedArityMethod := walker compiledMethodAt: fixedSel environmentId: 1 otherwise: nil.
		varargsMethod := walker compiledMethodAt: vaSel environmentId: 1 otherwise: nil.
		"A FIXED-ARITY FORWARDER IS NOT THE METHOD, it is a trampoline INTO
		the method: its whole body is a virtual re-send of the varargs form.
		Running one from here would undo the point of an unbound call --
		``Base.__exit__(self, t, v, tb)'' asks for BASE's implementation, and
		a virtual re-send lands on the subclass override that called it.
		test_with's MockNested does exactly that and recursed until the stack
		ran out.  The forwarder's own class always publishes the varargs form
		it forwards to, so skipping it costs no lookup."
		(kwOk
			and: [fixedArityMethod notNil
			and: [(self _isFixedArityForwarder: fixedSel on: walker) not]])
				ifTrue: [^ fixedArityMethod].
		varargsMethod ifNotNil: [^ varargsMethod].
		fixedArityMethod ifNotNil: [^ fixedArityMethod].
		walker := walker superClass].
	^ nil

]

{ #category : 'Grail-Private' }
UnboundMethod >> _setClass: aClass selector: aSym [

	definingClass := aClass.
	selector := aSym.
	"WHEN THIS HANDLE WAS MINTED, so ___grailPinnedMethodFor___:receiver: can
	tell a capture that PREDATES a pin from a lookup made afterwards -- the same
	stamp BoundMethod carries, and needed here for the same reason.

	These handles are INTERNED per (class, selector), so the stamp only
	separates the two if pinning evicts the intern; BoundMethod class >>
	___grailPinSelector___: does that."
	pinGeneration := BoundMethod @env1:___grailPinGeneration___.

]

{ #category : 'Grail-Comparison' }
UnboundMethod >> = other [
	"Smalltalk equality mirrors the Python __eq__ (definingClass + selector)
	so an unbound handle works as a Python set/dict key (Grail collections
	key on Smalltalk =/hash).  Transient wrappers -- no rehash hazard."

	^ (other isKindOf: UnboundMethod)
		and: [definingClass == (other definingClass) and: [selector == (other selector)]]

]

{ #category : 'Grail-Accessing' }
UnboundMethod >> definingClass [
	^ definingClass

]

{ #category : 'Grail-Comparison' }
UnboundMethod >> hash [
	^ definingClass identityHash bitXor: selector hash

]

{ #category : 'Grail-Accessing' }
UnboundMethod >> selector [
	^ selector

]
