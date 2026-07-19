! ------------------- Superclass check
run
Number ifNil: [self error: 'Number is not defined. Check file ordering.'].
%

! ------- AbstractPyFloat class definition
expectvalue /Class
doit
Number subclass: 'AbstractPyFloat'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
AbstractPyFloat comment:
'The float twin of [[AbstractPyInt]]: a reusable base for Python objects
that ARE a float by value but also carry extra attributes.  ``class
MyFloat(float)`` cannot subclass the sealed kernel Float/SmallDouble
(immediate storage), so Class>>___subclass___ substitutes this
Number sibling.

# Generality
``_generality`` returns 80 -- ABOVE SmallInteger (20) / LargeInteger
(40) / SmallFraction (70) and BELOW SmallDouble (85).  Mixed
arithmetic with an integer coerces the INTEGER up through
``_coerce:`` (``1 + MyFloat(2.5)`` retries as ``1.0 + wrapper`` and
lands in the Float branch); mixed arithmetic with a kernel float
coerces the WRAPPER down to its plain value via ``asFloat``.  Either
way the result is a plain SmallDouble -- CPython float-subclass
operator semantics (``MyFloat(2.5) + 1`` is a plain float).

The wrapped value lives in dynamic instVar ``#value``.'
%

expectvalue /Class
doit
AbstractPyFloat category: 'Grail-Modules'
%

! ------------------- Remove existing behavior
expectvalue /Metaclass3
doit
AbstractPyFloat removeAllMethods.
AbstractPyFloat class removeAllMethods.
AbstractPyFloat removeAllMethods: 1.
AbstractPyFloat class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: AbstractPyFloat
new
	"Number disallows #new; route ClassDefAst's ``self new`` +
	``__init__`` allocation path to basicNew (same as AbstractPyInt)."

	^ self @env0:basicNew
%

category: 'Grail-Accessors'
method: AbstractPyFloat
value
	"The underlying SmallDouble."

	^ self @env0:dynamicInstVarAt: #value
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
_generality
	^ 80
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
_coerce: aNumber
	"Called when THIS wrapper is the higher-generality operand (the
	other side is an integer/fraction): lift the other side to a plain
	Float so the retried operation lands in the Float branch, which
	then strips this wrapper via asFloat."

	^ aNumber @env0:asFloat
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
asFloat
	^ self @env0:value
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
truncated
	^ self @env0:value truncated
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
asInteger
	^ self @env0:value truncated
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
asFraction
	^ self @env0:value asFraction
%

! ------------------- Receiver-side arithmetic (env 0) -- Number's
! binary selectors are ABSTRACT; the coercion retry only fires when a
! concrete kernel number RECEIVES the wrapper (see AbstractPyInt).

category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
+ other
	^ self @env0:value + ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
- other
	^ self @env0:value - ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
* other
	^ self @env0:value * ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
/ other
	^ self @env0:value / ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
// other
	^ self @env0:value // ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
\\ other
	^ self @env0:value \\ ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
rem: other
	^ self @env0:value rem: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
quo: other
	^ self @env0:value quo: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
raisedTo: other
	^ self @env0:value raisedTo: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
min: other
	^ self @env0:value min: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
max: other
	^ self @env0:value max: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other @env0:value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
negated
	^ self @env0:value negated
%

category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
abs
	^ self @env0:value abs
%

category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
printOn: aStream
	aStream @env0:nextPutAll: self @env0:value printString
%

! ------------------- Relational + identity (env 0, receiver side)

category: 'Grail-Comparison'
method: AbstractPyFloat
< other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self @env0:value < other @env0:value].
	^ self @env0:value < other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
<= other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self @env0:value <= other @env0:value].
	^ self @env0:value <= other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
> other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self @env0:value > other @env0:value].
	^ self @env0:value > other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
>= other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self @env0:value >= other @env0:value].
	^ self @env0:value >= other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
= other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self @env0:value = other @env0:value].
	^ self @env0:value = other
%

category: 'Grail-Hashing'
method: AbstractPyFloat
hash
	^ self @env0:value hash
%

! ------------------- DNU forwarder (env-0, so env-1 misses route here)

category: 'Grail-Python Protocol'
method: AbstractPyFloat
doesNotUnderstand: aSelector args: anArray envId: envId
	"Forward unknown env-1 messages (__add__, __mul__, ...) to the
	wrapped SmallDouble, unwrapping wrapper arguments (see
	AbstractPyInt for the rationale)."

	| unwrapped |
	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSelector args: anArray envId: envId
	].
	unwrapped := anArray @env0:collect: [:a |
		(a isKindOf: AbstractPyFloat) ifTrue: [a @env0:value] ifFalse: [a]].
	^ self @env0:value perform: aSelector env: 1 withArguments: unwrapped
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
cantPerform: aSymbol withArguments: anArray env: envId
	^ self doesNotUnderstand: aSymbol args: anArray envId: envId
%

set compile_env: 1

category: 'Grail-Instantiation'
method: AbstractPyFloat
___new__: positional kw: keywords
	"float-subclass constructor (self is the CLASS; see AbstractPyInt).
	MyFloat(2.5) / MyFloat('2.5') construct through float's conversion;
	a conversion failure leaves the value slot for __init__ (enum-style
	subclasses construct with non-numeric args)."

	| inst v |
	inst := self @env0:new.
	v := [positional @env0:size @env0:= 0
			ifTrue: [0.0]
			ifFalse: [float @env1:__new__: (positional @env0:at: 1)]]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: nil].
	v == nil ifFalse: [
		inst @env0:dynamicInstVarAt: #value put: v].
	^ inst
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__float__
	^ self @env0:value
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__int__
	^ (self @env0:value) @env0:truncated
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__hash__
	^ self @env0:value @env1:__hash__
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__str__
	^ self @env0:value @env1:__str__
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__repr__
	^ self @env0:value @env1:__repr__
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__eq__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value @env1:__eq__: (other @env0:value)
	].
	^ self @env0:value @env1:__eq__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__ne__: other
	^ (self @env1:__eq__: other) not
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__lt__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value @env1:__lt__: (other @env0:value)
	].
	^ self @env0:value @env1:__lt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__le__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value @env1:__le__: (other @env0:value)
	].
	^ self @env0:value @env1:__le__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__gt__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value @env1:__gt__: (other @env0:value)
	].
	^ self @env0:value @env1:__gt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__ge__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value @env1:__ge__: (other @env0:value)
	].
	^ self @env0:value @env1:__ge__: other
%

set compile_env: 0
