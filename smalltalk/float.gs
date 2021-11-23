! ------------------- Remove existing behavior from float
removeAllMethods float
removeAllClassMethods float
! ------------------- Class methods for float
set compile_env: 0
category: 'Smalltalk'
classmethod: float
___value: aNumber

	(aNumber isKindOf: Number) ifFalse: [
		ValueError signal: 'int() arg is a malformed string'.
	].
	^self basicNew
		___value: aNumber asFloat;
		yourself
%
! ------------------- Instance methods for float
set compile_env: 0
category: 'Python'
method: float
__abs__

	^float ___value: value abs
%
category: 'Python'
method: float
__add__: anObject

	^float ___value: value + anObject ___value
%
category: 'Python'
method: float
__bool__

	^bool ___value: value ~= 0
%
category: 'Python'
method: float
__ceil__

	^int ___value: value ceiling
%
category: 'Python'
method: float
__divmod__: anObject

	^tuple  ___new__init__: { value // anObject ___value. value \\ anObject ___value }
%
category: 'Python'
method: float
__eq__: anObject

	^bool ___value: value = anObject ___value
%
category: 'Python'
method: float
__float__

	^self
%
category: 'Python'
method: float
__floor__

	^int ___value: value floor
%
category: 'Python'
method: float
__floordiv__: anObject

	^int ___value: value // anObject ___value
%
category: 'Python'
method: float
__ge__: anObject

	^bool ___value: value >= anObject ___value
%
category: 'Python'
method: float
__gt__: anObject

	^bool ___value: value > anObject ___value
%
category: 'Python'
method: float
__int__

	^self __trunc__
%
category: 'Python'
method: float
__le__: anObject

	^bool ___value: value <= anObject ___value
%
category: 'Python'
method: float
__lt__: anObject

	^bool ___value: value < anObject ___value
%
category: 'Python'
method: float
__mod__: anObject

	^float ___value: (value rem: anObject ___value)
%
category: 'Python'
method: float
__mul__: anObject

	^float ___value: value * anObject ___value
%
category: 'Python'
method: float
__ne__: anObject

	^bool ___value: value ~= anObject ___value
%
category: 'Python'
method: float
__neg__

	^float ___value: value negated
%
category: 'Python'
method: float
__pos__

	^self __abs__
%
category: 'Python'
method: float
__pow__: anObject

	^float ___value: (value raisedTo: anObject ___value)
%
category: 'Python'
method: float
__radd__: any

	^any __add__: self
%
category: 'Python'
method: float
__rand__: any

	^any __and__: self
%
category: 'Python'
method: float
__rdivmod__: any

	^any __divmod__: self
%
category: 'Python'
method: float
__rfloordiv__: any

	^any __floordiv__: self
%
category: 'Python'
method: float
__rmod__: any

	^any __mod__: self
%
category: 'Python'
method: float
__rmul__: any

	^any __mul__: self
%
category: 'Python'
method: float
__round__

	^int ___value: value rounded
%
category: 'Python'
method: float
__rpow__: any

	^any __pow__: self
%
category: 'Python'
method: float
__rsub__: any

	^any __sub__: self
%
category: 'Python'
method: float
__rtruediv__: any

	^any __truediv__: self
%
category: 'Python'
method: float
__sub__: anObject

	^float ___value: value - anObject ___value
%
category: 'Python'
method: float
__truediv__: anObject

	^float ___value: value / anObject ___value
%
category: 'Python'
method: float
__trunc__

	^int ___value: value truncated
%
category: 'Python'
method: float
as_integer_ratio

	| val |
	val := value asFraction.
   ^tuple ___new__init__: { val numerator. val denominator }
%
category: 'Python'
method: float
conjugate

	^self
%
category: 'Python'
method: float
imag

	^float ___value: 0
%
category: 'Python'
method: float
is_integer

	^self __trunc__ __eq__: self
%
category: 'Python'
method: float
real

	^self
%
set compile_env: 0
category: 'Smalltalk'
method: float
___initArgs: args

	self error: 'We should use another initialization method'.
	args  isEmpty ifTrue: [^self ___initialize: 0].
   ^self ___initialize: args first
%
category: 'Smalltalk'
method: float
___initialize: val

	self error: 'We should use another initialization method'.
	value := val asFloat
%
category: 'Smalltalk'
method: float
___value

	^value
%
category: 'Smalltalk'
method: float
___value: anInteger

	value := anInteger
%
category: 'Smalltalk'
method: float
printOn: aStream

	aStream
		nextPutAll: 'float(';
		print: value;
		nextPut: $);
		yourself.
%
