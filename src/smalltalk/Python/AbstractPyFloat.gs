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

	^ self basicNew
%

category: 'Grail-Accessors'
method: AbstractPyFloat
value
	"The underlying SmallDouble."

	^ self dynamicInstVarAt: #value
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

	^ aNumber asFloat
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
asFloat
	^ self value
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
truncated
	^ self value truncated
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
asInteger
	^ self value truncated
%

category: 'Grail-Arithmetic Support'
method: AbstractPyFloat
asFraction
	^ self value asFraction
%

! ------------------- Receiver-side arithmetic (env 0) -- Number's
! binary selectors are ABSTRACT; the coercion retry only fires when a
! concrete kernel number RECEIVES the wrapper (see AbstractPyInt).

category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
+ other
	^ self value + ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
- other
	^ self value - ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
* other
	^ self value * ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
/ other
	^ self value / ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
// other
	^ self value // ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
\\ other
	^ self value \\ ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
rem: other
	^ self value rem: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
quo: other
	^ self value quo: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
raisedTo: other
	^ self value raisedTo: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
min: other
	^ self value min: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
max: other
	^ self value max: ((other isKindOf: AbstractPyFloat)
		ifTrue: [other value] ifFalse: [other])
%
category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
negated
	^ self value negated
%

category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
abs
	^ self value abs
%

category: 'Grail-Arithmetic Forward'
method: AbstractPyFloat
printOn: aStream
	aStream nextPutAll: self value printString
%

! ------------------- Relational + identity (env 0, receiver side)

category: 'Grail-Comparison'
method: AbstractPyFloat
< other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value < other value].
	^ self value < other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
<= other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value <= other value].
	^ self value <= other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
> other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value > other value].
	^ self value > other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
>= other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value >= other value].
	^ self value >= other
%

category: 'Grail-Comparison'
method: AbstractPyFloat
= other
	(other isKindOf: AbstractPyFloat) ifTrue: [^ self value = other value].
	^ self value = other
%

category: 'Grail-Hashing'
method: AbstractPyFloat
hash
	^ self value hash
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
	unwrapped := anArray collect: [:a |
		(a isKindOf: AbstractPyFloat) ifTrue: [a value] ifFalse: [a]].
	^ self value perform: aSelector env: 1 withArguments: unwrapped
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
cantPerform: aSymbol withArguments: anArray env: envId
	^ self doesNotUnderstand: aSymbol args: anArray envId: envId
%

set compile_env: 1

category: 'Grail-Instantiation'
classmethod: AbstractPyFloat
___hasUserInit___
	"True if this class defines its OWN Python __init__ (any arity),
	walking up to (but not including) AbstractPyFloat or kernel Object
	itself.  See AbstractPyInt's twin for why both exclusions are
	needed (AbstractPyFloat doesn't descend from Grail's ``object''
	root, and every class ultimately inherits kernel Object's own
	no-op env-1 __init__)."

	| owner builtins |
	builtins := { AbstractPyFloat. Object }.
	#( #'___init__:kw:' #'__init__:' #'__init__:_:' #'__init__' ) @env0:do: [:sel |
		owner := self @env0:whichClassIncludesSelector: sel environmentId: 1.
		(owner @env0:notNil and: [(builtins @env0:includes: owner) @env0:not]) ifTrue: [^ true]].
	^ false
%

category: 'Grail-Instantiation'
method: AbstractPyFloat
___new__: positional kw: keywords
	"float-subclass constructor (self is the CLASS; see AbstractPyInt).
	MyFloat(2.5) / MyFloat('2.5') construct through float's conversion;
	a conversion failure leaves the value slot for __init__ (enum-style
	subclasses construct with non-numeric args) -- but only when the
	class actually HAS its own __init__ to fill it afterward: a plain
	``class subclass(float): pass'' has nothing to recover with, so a
	genuine conversion failure must propagate (test_float.py's
	test_keywords_in_subclass: ``subclass(x=0)'' must raise TypeError,
	not silently construct 0.0).  CPython's float() also takes NO
	keyword arguments at all, unlike int()'s 'base'."

	| inst v |
	(keywords @env0:notNil and: [keywords @env0:notEmpty]) ifTrue: [
		(self ___hasUserInit___) ifFalse: [
			TypeError ___signal___: 'float() takes no keyword arguments']].
	inst := self @env0:new.
	v := [positional @env0:size @env0:= 0
			ifTrue: [0.0]
			ifFalse: [float __new__: (positional @env0:at: 1)]]
		@env0:on: AbstractException
		do: [:ex | (self ___hasUserInit___) ifTrue: [ex @env0:return: nil] ifFalse: [ex @env0:pass]].
	v == nil ifFalse: [
		inst @env0:dynamicInstVarAt: #value put: v].
	^ inst
%

category: 'Grail-Class Methods'
classmethod: AbstractPyFloat
fromhex: hexString
	"Delegate to float's parser, then construct THIS class (mirrors
	float class>>fromhex:'s own subclass routing -- see there)."

	^ self value: (Array @env0:with: (float ___parseHex___: hexString)) value: nil
%

category: 'Grail-Class Methods'
classmethod: AbstractPyFloat
from_number
	^ float from_number
%

category: 'Grail-Class Methods'
classmethod: AbstractPyFloat
from_number: obj
	"Delegate to float's strict numeric-only conversion, then construct
	THIS class (mirrors float class>>from_number:'s own routing)."

	^ self value: (Array @env0:with: (float ___fromNumberValue___: obj)) value: nil
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
	^ self @env0:value __hash__
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__str__
	^ self @env0:value __str__
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__repr__
	^ self @env0:value __repr__
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__eq__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __eq__: (other @env0:value)
	].
	^ self @env0:value __eq__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__ne__: other
	^ (self __eq__: other) not
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__lt__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __lt__: (other @env0:value)
	].
	^ self @env0:value __lt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__le__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __le__: (other @env0:value)
	].
	^ self @env0:value __le__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__gt__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __gt__: (other @env0:value)
	].
	^ self @env0:value __gt__: other
%

category: 'Grail-Python Protocol'
method: AbstractPyFloat
__ge__: other
	(other isKindOf: AbstractPyFloat) ifTrue: [
		^ self @env0:value __ge__: (other @env0:value)
	].
	^ self @env0:value __ge__: other
%

set compile_env: 0
