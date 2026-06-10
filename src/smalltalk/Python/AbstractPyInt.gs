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

	^ self @env0:basicNew
%

! ------------------- Accessors

category: 'Grail-Accessors'
method: AbstractPyInt
value
	"The underlying SmallInteger.  Read by the numeric protocol below
	and by the CPython shim (PyLong_As* -> __index__) at the C boundary."

	^ self @env0:dynamicInstVarAt: #value
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
	^ self @env0:value
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
asInteger
	^ self @env0:value
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
asFraction
	"Needed by Integer>>< / >>= , whose fallback compares through
	AbstractFraction when the argument is a non-SmallInteger Number."

	^ self @env0:value asFraction
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
asFloat
	^ self @env0:value asFloat
%

category: 'Grail-Arithmetic Support'
method: AbstractPyInt
_coerce: aNumber
	^ aNumber truncated
%

! ------------------- Relational + identity (env 0, receiver side)

category: 'Grail-Comparison'
method: AbstractPyInt
< other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self @env0:value < other @env0:value].
	^ self @env0:value < other
%

category: 'Grail-Comparison'
method: AbstractPyInt
<= other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self @env0:value <= other @env0:value].
	^ self @env0:value <= other
%

category: 'Grail-Comparison'
method: AbstractPyInt
> other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self @env0:value > other @env0:value].
	^ self @env0:value > other
%

category: 'Grail-Comparison'
method: AbstractPyInt
>= other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self @env0:value >= other @env0:value].
	^ self @env0:value >= other
%

category: 'Grail-Comparison'
method: AbstractPyInt
= other
	(other isKindOf: AbstractPyInt) ifTrue: [^ self @env0:value = other @env0:value].
	^ self @env0:value = other
%

category: 'Grail-Hashing'
method: AbstractPyInt
hash
	^ self @env0:value hash
%

! ------------------- DNU forwarder (env-0, so env-1 misses route here)

category: 'Grail-Python Protocol'
method: AbstractPyInt
doesNotUnderstand: aSelector args: anArray envId: envId
	"Forward unknown env-1 messages (__add__, __sub__, __and__, ...) to
	the wrapped SmallInteger.  The result strips the wrapper — a
	documented, intentional limitation for arithmetic."

	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	^ self @env0:value perform: aSelector env: 1 withArguments: anArray
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
cantPerform: aSymbol withArguments: anArray env: envId
	"Mirror DNU for explicit perform:env: calls."

	^ self doesNotUnderstand: aSymbol args: anArray envId: envId
%

set compile_env: 1

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

	^ self @env0:value @env1:__hash__
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__str__
	"Mirror Python's int subclass: str() is the integer's string."

	^ self @env0:value @env1:__str__
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__repr__
	"Default repr is the integer's repr; subclasses (NamedIntConstant,
	HTTPStatus) override to show the symbolic name."

	^ self @env0:value @env1:__repr__
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__eq__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value @env1:__eq__: (other @env0:value)
	].
	^ self @env0:value @env1:__eq__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__ne__: other
	^ (self @env1:__eq__: other) not
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__lt__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value @env1:__lt__: (other @env0:value)
	].
	^ self @env0:value @env1:__lt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__le__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value @env1:__le__: (other @env0:value)
	].
	^ self @env0:value @env1:__le__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__gt__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value @env1:__gt__: (other @env0:value)
	].
	^ self @env0:value @env1:__gt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyInt
__ge__: other
	(other isKindOf: AbstractPyInt) ifTrue: [
		^ self @env0:value @env1:__ge__: (other @env0:value)
	].
	^ self @env0:value @env1:__ge__: other
%

set compile_env: 0
