! ------------------- Superclass check
run
Number ifNil: [self error: 'Number is not defined. Check file ordering.'].
%

! ------- AbstractPyInt class definition
expectvalue /Class
doit
Number subclass: 'AbstractPyInt'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
AbstractPyInt comment:
'Reusable base for Python objects that ARE an integer by value but
also carry extra attributes — ``re``''s [[NamedIntConstant]] opcodes,
``http.HTTPStatus`` members, and (eventually) ``enum.IntEnum`` members.

# Why a Number subclass, not an int subclass
Grail maps Python ``int`` to Smalltalk ``Integer``, which GemStone
forbids subclassing (classErrSubclassDisallowed); ``SmallInteger`` is
a tagged immediate and ``LargeInteger`` is byte-format, so neither can
carry instance variables.  ``Number`` IS subclassable, and GemStone''s
coercion (``Number>>_retry:coercing:`` -> ``_generality`` + ``_coerce:``)
lets a Number subclass behave as a plain integer in mixed arithmetic.

# How it behaves like an int
The wrapped value lives in dynamic instVar ``#value``.  ``_generality``
returns 10 — below SmallInteger''s 20 — so any mixed arithmetic coerces
the wrapper DOWN to its plain ``value`` (via ``truncated``) in both
operand orders, yielding a plain SmallInteger (arithmetic intentionally
strips the wrapper, matching CPython, where ``HTTPStatus.OK + 1`` is a
plain int).  ``asFraction`` / ``asFloat`` satisfy the kernel''s relational
fallbacks (``Integer>><`` coerces through ``AbstractFraction``).
Receiver-side relational ops and the Python dunder protocol delegate to
``value``; ``isinstance(x, int)`` is made true by ``int``''s
``__instancecheck__:`` recognizing this class (see Int.gs).

# Subclassing from Python
``class HTTPStatus(AbstractPyInt)`` works: the class-side ``new`` below
overrides Number''s disallowed ``new`` so ClassDefAst''s emitted
``self new`` + ``__init__`` path can allocate the instance.'
%

expectvalue /Class
doit
AbstractPyInt category: 'Grail-Modules'
%

! ------------------- Remove existing behavior
expectvalue /Metaclass3
doit
AbstractPyInt removeAllMethods.
AbstractPyInt class removeAllMethods.
AbstractPyInt removeAllMethods: 1.
AbstractPyInt class removeAllMethods: 1.
%

set compile_env: 0

! ------------------- Class-side allocation

category: 'Grail-Instance Creation'
classmethod: AbstractPyInt
new
	"Number disallows #new.  Python subclasses are instantiated by
	ClassDefAst-emitted code that sends ``self new`` then ``__init__``;
	route to basicNew so that path can allocate."

	^ self basicNew
%

! ------------------- Accessors

category: 'Grail-Accessors'
method: AbstractPyInt
value
	"The underlying SmallInteger.  Read by the numeric protocol below
	and by the CPython shim (PyLong_As* -> __index__) at the C boundary."

	^ self dynamicInstVarAt: #value
%

! ------------------- Numeric coercion protocol (env 0)
!
! GemStone's Number>>_retry:coercing: coerces the lower-generality
! operand to the higher.  Generality 10 (below SmallInteger's 20) means
! the wrapper is always coerced to its plain value, so mixed arithmetic
! produces a plain SmallInteger.

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
_generality
	^ 10
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
truncated
	^ self value
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
asInteger
	^ self value
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
asFraction
	"Needed by Integer>>< / >>= , whose fallback compares through
	AbstractFraction when the argument is a non-SmallInteger Number."

	^ self value asFraction
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
asFloat
	^ self value asFloat
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
_coerce: aNumber
	^ aNumber truncated
%

! ------------------- Receiver-side arithmetic (env 0)
!
! Number's binary selectors are ABSTRACT (subclassResponsibility) --
! the coercion retry only fires when a CONCRETE kernel number
! receives the wrapper as its ARGUMENT.  Receiver-side ops forward
! to the plain value, unwrapping a wrapper argument; results are
! plain integers (CPython int-subclass operator semantics).

category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
+ other
	^ self value + ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
- other
	^ self value - ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
* other
	^ self value * ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
/ other
	^ self value / ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
// other
	^ self value // ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
\\ other
	^ self value \\ ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
rem: other
	^ self value rem: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
quo: other
	^ self value quo: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
bitAnd: other
	^ self value bitAnd: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
bitOr: other
	^ self value bitOr: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
bitXor: other
	^ self value bitXor: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
bitShift: other
	^ self value bitShift: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
raisedTo: other
	^ self value raisedTo: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
min: other
	^ self value min: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
max: other
	^ self value max: ((other isKindOf: AbstractPyInt)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
negated
	^ self value negated
%

category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
abs
	^ self value abs
%

category: 'Grail-Arithmetic Forward'
method: AbstractPyInt
printOn: aStream
	aStream nextPutAll: self value printString
%

! ------------------- Relational + identity (env 0, receiver side)

category: 'Grail-Comparison'
method: AbstractPyInt
< other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value < other value].
	^ self value < other
%

category: 'Grail-Comparison'
method: AbstractPyInt
<= other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value <= other value].
	^ self value <= other
%

category: 'Grail-Comparison'
method: AbstractPyInt
> other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value > other value].
	^ self value > other
%

category: 'Grail-Comparison'
method: AbstractPyInt
>= other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value >= other value].
	^ self value >= other
%

category: 'Grail-Comparison'
method: AbstractPyInt
= other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self value = other value].
	^ self value = other
%

category: 'Grail-Hashing'
method: AbstractPyInt
hash
	^ self value hash
%

! ------------------- DNU forwarder (env-0, so env-1 misses route here)

category: 'Grail-Python Protocol'
method: AbstractPyInt
doesNotUnderstand: aSelector args: anArray envId: envId
	"Forward unknown env-1 messages (__add__, __sub__, __or__, ...) to
	the wrapped SmallInteger.  Arguments that are themselves AbstractPyInt
	wrappers are unwrapped to their value first — arithmetic (+, -, *) is
	coerced via _generality, but bitwise ops (bitOr:/bitAnd:) have no
	coercing retry, so e.g. ``IntFlag.A | IntFlag.B`` needs the right
	operand unwrapped here.  The result strips the wrapper (a documented,
	intentional limitation for arithmetic)."

	| unwrapped |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	unwrapped := anArray collect: [:a |
		(a isKindOf: AbstractPyInt) ifTrue: [a value] ifFalse: [a]].
	^ self value perform: aSelector env: 1 withArguments: unwrapped
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
cantPerform: aSymbol withArguments: anArray env: envId
	"Mirror DNU for explicit perform:env: calls."

	^ self doesNotUnderstand: aSymbol args: anArray envId: envId
%

set compile_env: 1

! ------------------- Constructor (allocator protocol)

category: 'Grail-Instantiation'
classmethod: AbstractPyInt
___hasUserInit___
	"True if this class defines its OWN Python __init__ (any arity),
	walking up to (but not including) AbstractPyInt or kernel Object
	itself.  Mirrors object class>>___hasUserInit___, but AbstractPyInt
	does not descend from Grail's ``object'' root (it's a Number
	sibling -- see the class comment), so it cannot inherit that
	version; needed so ___new__:kw:'s conversion-failure swallow only
	fires for classes that truly have an __init__ left to fill the
	#value slot.  Every class -- AbstractPyInt included -- ultimately
	inherits kernel Object's own env-1 ``__init__'' (a no-op returning
	None), so that has to be excluded too, or whichClassIncludesSelector:
	always finds SOME owner and every subclass looks user-init'd."

	| owner builtins |
	builtins := { AbstractPyInt. Object }.
	#( #'___init__:kw:' #'__init__:' #'__init__:_:' #'__init__' ) @env0:do: [:sel |
		owner := self @env0:whichClassIncludesSelector: sel environmentId: 1.
		(owner @env0:notNil and: [(builtins @env0:includes: owner) @env0:not]) ifTrue: [^ true]].
	^ false
%

category: 'Grail-Instantiation'
method: AbstractPyInt
___new__: positional kw: keywords
	"int-subclass constructor: ``self`` is the CLASS (object class>>
	___allocateInstance___ runs a class-body/inherited __new__
	non-virtually with the class as receiver), so ``class MyInt(int):
	pass`` constructs through int's conversion: MyInt(3), MyInt('7'),
	MyInt('101', 2).  A conversion failure leaves the value slot for
	__init__ to fill -- enum-style AbstractPyInt subclasses construct
	with non-numeric args and set #value themselves.  But that swallow
	is only sound when the class actually HAS its own __init__ to fill
	the slot afterward: a plain ``class IntSubclass(int): pass`` (no
	__init__) has nothing to recover with, so a genuine conversion
	failure (invalid literal, digit-limit ValueError, ...) must
	propagate exactly as it would for plain int() -- test_int.py's
	IntSubclassStrDigitLimitsTests otherwise never sees the ValueError
	its assertRaises blocks expect."

	| inst v |
	inst := self @env0:new.
	v := [positional @env0:size @env0:= 0
			ifTrue: [0]
			ifFalse: [positional @env0:size @env0:= 1
				ifTrue: [int __new__: (positional @env0:at: 1)]
				ifFalse: [int __new__: (positional @env0:at: 1) _: (positional @env0:at: 2)]]]
		@env0:on: AbstractException
		do: [:ex | (self ___hasUserInit___) ifTrue: [ex @env0:return: nil] ifFalse: [ex @env0:pass]].
	v == nil ifFalse: [
		inst @env0:dynamicInstVarAt: #value put: v].
	^ inst
%

! ------------------- Python protocol (env 1)
!
! object defines abstract env-1 stubs for the comparison dunders that
! would intercept dispatch before the env-0 DNU forwarder, so the
! comparisons must be overridden explicitly here.

category: 'Grail-Python Protocol'
method: AbstractPyInt
__index__
	"PEP 357 integer-conversion contract.  Always a SmallInteger."

	^ self @env0:value
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__int__
	^ self @env0:value
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__hash__
	"Hash by value so a wrapper and its int collide consistently with
	__eq__ in dict/set membership."

	^ self @env0:value __hash__
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__str__
	"Mirror Python's int subclass: str() is the integer's string."

	^ self @env0:value __str__
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__repr__
	"Default repr is the integer's repr; subclasses (NamedIntConstant,
	HTTPStatus) override to show the symbolic name."

	^ self @env0:value __repr__
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__eq__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __eq__: (other @env0:value)
	].
	^ self @env0:value __eq__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__ne__: other
	^ (self __eq__: other) not
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__lt__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __lt__: (other @env0:value)
	].
	^ self @env0:value __lt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__le__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __le__: (other @env0:value)
	].
	^ self @env0:value __le__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__gt__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __gt__: (other @env0:value)
	].
	^ self @env0:value __gt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__ge__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value __ge__: (other @env0:value)
	].
	^ self @env0:value __ge__: other
%

set compile_env: 0
