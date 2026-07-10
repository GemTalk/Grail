! ===============================================================================
! Boolean Methods (Python 'bool' type)
! ===============================================================================
! This file contains method implementations for the Boolean class when used
! as the Python 'bool' type. In Python, bool is a subclass of int with only
! two instances: True and False.
!
! In GemStone, Boolean is a separate class with singleton instances true and false.
! We map Python's True to true and False to false, and implement Python's bool
! methods in environment 1.
!
! Key differences from Python:
! - In Python: bool is a subclass of int, True and False are instances of bool
! - In GemStone: Boolean is separate from Integer, true and false are singletons
! - We make Boolean behave like int for arithmetic (true=1, false=0)
! ===============================================================================

! ------------------- Remove existing Python methods from bool
expectvalue /Metaclass3
doit
bool removeAllMethods: 1.
bool class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Arithmetic Operators'
method: bool
* aNumber
	"Multiply bool (as integer) by aNumber."

	^ self asInteger * aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
+ aNumber
	"Add bool (as integer) to aNumber."

	^ self asInteger + aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
- aNumber
	"Subtract aNumber from bool (as integer)."

	^ self asInteger - aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
/ aNumber
	"Divide bool (as integer) by aNumber."

	^ self asInteger / aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
// aNumber
	"Integer division of bool (as integer) by aNumber."

	^ self asInteger // aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
< aNumber
	"Less than comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger < otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
<= aNumber
	"Less than or equal comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger <= otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
= anObject
	"Equality comparison. Handle bool specially, otherwise compare as integer."

	| otherInt |
	otherInt := anObject class == bool
		ifTrue: [anObject ifTrue: [1] ifFalse: [0]]
		ifFalse: [anObject].
	^ self asInteger = otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
> aNumber
	"Greater than comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger > otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
>= aNumber
	"Greater than or equal comparison."

	| otherInt |
	otherInt := aNumber class == bool
		ifTrue: [aNumber ifTrue: [1] ifFalse: [0]]
		ifFalse: [aNumber].
	^ self asInteger >= otherInt
%

category: 'Grail-Arithmetic Operators'
method: bool
\\ aNumber
	"Modulo of bool (as integer) by aNumber."

	^ self asInteger \\ aNumber
%

category: 'Grail-Arithmetic Support'
method: bool
_coerce: aNumber
	"Coerce aNumber to be compatible with bool (as integer).
	Convert aNumber to Integer since bool behaves like Integer for arithmetic."

	^ aNumber asInteger
%

category: 'Grail-Arithmetic Support'
method: bool
_generality
	"Return generality for bool in numeric hierarchy.
	bool has the LOWEST generality (10) so it gets coerced to other numeric types.
	This is lower than SmallInteger (20) and Integer (40)."

	^ 10
%

category: 'Grail-Arithmetic'
method: bool
abs
	"Return absolute value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Conversion'
method: bool
asFixedPoint: scale
	"Convert bool to FixedPoint."

	^ self asInteger asFixedPoint: scale
%

category: 'Grail-Conversion'
method: bool
asFloat
	"Convert bool to Float (true=1.0, false=0.0)."

	^ self ifTrue: [1.0] ifFalse: [0.0]
%

category: 'Grail-Conversion'
method: bool
asFraction
	"Convert bool to Fraction (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Conversion'
method: bool
asInteger
	"Convert bool to int (true=1, false=0)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Conversion'
method: bool
asScaledDecimal: scale
	"Convert bool to ScaledDecimal."

	^ self asInteger asScaledDecimal: scale
%

category: 'Grail-Conversion'
method: bool
ceiling
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Testing'
method: bool
even
	"Return true if even (true=1 is odd, false=0 is even)."

	^ self not
%

category: 'Grail-Conversion'
method: bool
floor
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Arithmetic Support'
method: bool
isNumber
	"Return true - bool participates in arithmetic as a number.
	Note: We override isNumber (not _isNumber which is an optimized selector)."

	^ true
%

category: 'Grail-Arithmetic Operators'
method: bool
max: aNumber
	"Return maximum of bool (as integer) and aNumber."

	^ self asInteger max: aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
min: aNumber
	"Return minimum of bool (as integer) and aNumber."

	^ self asInteger min: aNumber
%

category: 'Grail-Arithmetic'
method: bool
negated
	"Return negation (true=-1, false=0)."

	^ self asInteger negated
%

category: 'Grail-Testing'
method: bool
negative
	"Return false - booleans as integers are never negative."

	^ false
%

category: 'Grail-Testing'
method: bool
odd
	"Return true if odd (true=1 is odd, false=0 is even)."

	^ self
%

category: 'Grail-Testing'
method: bool
positive
	"Return true if self is true or false (equivalent to >= 0)."

	^ true
%

category: 'Grail-Arithmetic Operators'
method: bool
raisedTo: aNumber
	"Raise bool (as integer) to the power of aNumber."

	^ self asInteger raisedTo: aNumber
%

category: 'Grail-Arithmetic Operators'
method: bool
raisedToInteger: aNumber
	"Raise bool (as integer) to the power of aNumber (integer)."

	^ self asInteger raisedToInteger: aNumber
%

category: 'Grail-Arithmetic'
method: bool
reciprocal
	"Return reciprocal (true=1, false=error)."

	^ self asInteger reciprocal
%

category: 'Grail-Conversion'
method: bool
rounded
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Arithmetic'
method: bool
sign
	"Return sign (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Testing'
method: bool
strictlyPositive
	"Return true if self is true (equivalent to > 0)."

	^ self
%

category: 'Grail-Conversion'
method: bool
truncated
	"Return integer value (true=1, false=0)."

	^ self asInteger
%

category: 'Grail-Arithmetic Operators'
method: bool
~= anObject
	"Inequality comparison. Handle bool specially, otherwise compare as integer."

	| otherInt |
	otherInt := anObject class == bool
		ifTrue: [anObject ifTrue: [1] ifFalse: [0]]
		ifFalse: [anObject].
	^ self asInteger ~= otherInt
%

set compile_env: 1

category: 'Grail-Initialization'
classmethod: bool
__new__
	"Create a bool instance with default value False.
	In Python: bool() or bool.__new__(bool)"

	^ false
%

category: 'Grail-Initialization'
classmethod: bool
__new__: obj
	"Create a bool instance from an object by calling its __bool__ method.
	In Python: bool(obj) or bool.__new__(bool, obj)"

	| result |
	"None is falsy. Smalltalk nil (undefined) is treated the same here for
	bridge robustness."
	(obj == nil or: [obj == None]) ifTrue: [ ^ false ].

	"If already a bool, return it"
	(obj @env0:isKindOf: bool) ifTrue: [
		^ obj
	].

	"Try to call __bool__ on the object via env-1 dispatch.  env-0
	``respondsTo:`` only inspects env-0 method dictionaries; Python's
	``__bool__`` is compiled in env 1 on user classes (e.g. Grail's
	collections.deque), so the check used to miss and fall through to
	the unconditional ``true`` below — leaving every empty user
	container truthy."
	result := [obj __bool__]
		@env0:on: MessageNotUnderstood do: [:ex | ex @env0:return: #__noBool__].
	result == #__noBool__ ifFalse: [^ result].

	"Try __len__ next: ``bool(x)`` defers to ``len(x) != 0`` when
	__bool__ is absent — matches CPython's PEP-3119 fallback."
	result := [obj __len__]
		@env0:on: MessageNotUnderstood do: [:ex | ex @env0:return: #__noLen__].
	result == #__noLen__ ifFalse: [^ result @env0:~= 0].

	"For integers, 0 is False, everything else is True"
	(obj @env0:isKindOf: int) ifTrue: [
		^ obj @env0:~= 0
	].

	"For floats, 0.0 is False, everything else is True"
	(obj @env0:isKindOf: Float) ifTrue: [
		^ obj @env0:~= 0.0
	].

	"For strings, empty string is False"
	(obj @env0:isKindOf: Unicode7) ifTrue: [
		^ (obj @env0:size) @env0:> 0
	].

	"For collections, empty is False"
	(obj @env0:isKindOf: Collection) ifTrue: [
		^ (obj @env0:size) @env0:> 0
	].

	"Default: everything else is True"
	^ true
%

category: 'Grail-Logical Operators'
method: bool
___and___: aBlock
	"Short-circuit logical AND. If self is false, return false.
	Otherwise, evaluate the block and return its value."

	^ self ifTrue: [aBlock value] ifFalse: [false]
%

category: 'Grail-Logical Operators'
method: bool
___or___: aBlock
	"Short-circuit logical OR. If self is true, return true.
	Otherwise, evaluate the block and return its value."

	^ self ifTrue: [true] ifFalse: [aBlock value]
%

category: 'Grail-Arithmetic'
method: bool
__abs__
	"Absolute value of bool (as int)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Arithmetic'
method: bool
__add__: other
	"Add bool (as int) to other."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:+ other
%

category: 'Grail-Bitwise'
method: bool
__and__: other
	"Bitwise AND.  ``bool & bool`` returns a BOOL in CPython (bool is
	an int subclass whose __and__ narrows the result); mixing with an
	int degrades to int semantics.  A Boolean argument must be coerced
	before bitAnd: — GemStone's integer primitive retry would
	otherwise forward #bitAnd: to the Boolean argument and DNU
	(twilio.request_validator's ``result &= c1 == c2``)."

	(other @env0:isKindOf: Boolean) ifTrue: [
		^ self @env0:and: [other]
	].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitAnd: other
%

category: 'Grail-Conversion'
method: bool
__bool__
	"Return self (already a bool)."

	^ self
%

category: 'Grail-Bridge'
method: bool
___isTruthy___
	"Boolean is already a Smalltalk Boolean."

	^ self
%

category: 'Grail-Documentation'
method: bool
__doc__
	"Return documentation string for bool type."

	^ 'bool(x) -> bool

Returns True when the argument x is true, False otherwise.
The builtins True and False are the only two instances of the class bool.
The class bool is a subclass of the class int, and cannot be subclassed.' @env0:asUnicodeString
%

category: 'Grail-Comparison'
method: bool
__eq__: other
	"Equality comparison. True==1 and False==0 in Python."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	^ selfInt @env0:= otherInt
%

category: 'Grail-Conversion'
method: bool
__float__
	"Convert bool to float (True=1.0, False=0.0)."

	^ self ifTrue: [1.0] ifFalse: [0.0]
%

category: 'Grail-Arithmetic'
method: bool
__floordiv__: other
	"Floor division of bool (as int) by other."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:// other
%

category: 'Grail-Comparison'
method: bool
__ge__: other
	"Greater than or equal comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	(otherInt @env0:isKindOf: Number)
		ifFalse: [^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'].
	^ selfInt @env0:>= otherInt
%

category: 'Grail-Comparison'
method: bool
__gt__: other
	"Greater than comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	(otherInt @env0:isKindOf: Number)
		ifFalse: [^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'].
	^ selfInt @env0:> otherInt
%

category: 'Grail-Conversion'
method: bool
__index__
	"Return int value (used for indexing). True=1, False=0."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Conversion'
method: bool
__int__
	"Convert bool to int (True=1, False=0)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Bitwise'
method: bool
__invert__
	"Bitwise NOT of bool (as int)."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitInvert
%

category: 'Grail-Comparison'
method: bool
__le__: other
	"Less than or equal comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	(otherInt @env0:isKindOf: Number)
		ifFalse: [^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'].
	^ selfInt @env0:<= otherInt
%

category: 'Grail-Comparison'
method: bool
__lt__: other
	"Less than comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	(otherInt @env0:isKindOf: Number)
		ifFalse: [^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'].
	^ selfInt @env0:< otherInt
%

category: 'Grail-Arithmetic'
method: bool
__mod__: other
	"Modulo of bool (as int) by other."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:\\ other
%

category: 'Grail-Arithmetic'
method: bool
__mul__: other
	"Multiply bool (as int) by other."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:* other
%

category: 'Grail-Comparison'
method: bool
__ne__: other
	"Inequality comparison."

	| selfInt otherInt |
	selfInt := self ifTrue: [1] ifFalse: [0].
	otherInt := (other @env0:class) == bool
		ifTrue: [other ifTrue: [1] ifFalse: [0]]
		ifFalse: [other].
	^ selfInt @env0:~= otherInt
%

category: 'Grail-Arithmetic'
method: bool
__neg__
	"Negate bool (as int)."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:negated
%

category: 'Grail-Bitwise'
method: bool
__or__: other
	"Bitwise OR.  bool | bool stays bool (see __and__: for the
	coercion rationale); bool | int degrades to int semantics."

	(other @env0:isKindOf: Boolean) ifTrue: [
		^ self @env0:or: [other]
	].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitOr: other
%

category: 'Grail-Arithmetic'
method: bool
__pos__
	"Unary plus of bool (as int)."

	^ self ifTrue: [1] ifFalse: [0]
%

category: 'Grail-Arithmetic'
method: bool
__pow__: other
	"Raise bool (as int) to power of other."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:raisedTo: other
%

category: 'Grail-String Representation'
method: bool
__repr__
	"Return the official string representation of the bool."

	^ (self ifTrue: ['True'] ifFalse: ['False']) @env0:asUnicodeString
%

category: 'Grail-String Representation'
method: bool
__str__
	"Return the informal string representation of the bool."

	^ (self ifTrue: ['True'] ifFalse: ['False']) @env0:asUnicodeString
%

category: 'Grail-Arithmetic'
method: bool
__sub__: other
	"Subtract other from bool (as int)."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:- (other)
%

category: 'Grail-Arithmetic'
method: bool
__truediv__: other
	"True division of bool (as int) by other."

	^ (self ifTrue: [1] ifFalse: [0]) @env0:/ other
%

category: 'Grail-Bitwise'
method: bool
__xor__: other
	"Bitwise XOR.  bool ^ bool stays bool (see __and__: for the
	coercion rationale); bool ^ int degrades to int semantics."

	(other @env0:isKindOf: Boolean) ifTrue: [
		^ self @env0:xor: other
	].
	^ (self ifTrue: [1] ifFalse: [0]) @env0:bitXor: other
%

set compile_env: 0
