! ------------------- Remove existing behavior from float
removeAllMethods float
removeAllClassMethods float
! ------------------- Class methods for float
! ------------------- Instance methods for float
set compile_env: 0
category: 'Python'
method: float
__abs__

	^float ___new__init__: value abs
%
category: 'Python'
method: float
__ceil__
	^int ___new__init__: value ceiling
%
category: 'Python'
method: float
__divmod__: anObject
	| val |
	val := (anObject isKindOf: Number)
	   ifTrue: [anObject]
		ifFalse: [anObject ___value].

	^tuple  ___new__init__: { value // val. value \\ val }
%
category: 'Python'
method: float
__float__
	^self
%
category: 'Python'
method: float
__floor__
	^int ___new__init__: value floor
%
category: 'Python'
method: float
__gt__: anObject
	| val |
	val := (anObject isKindOf: Number)
	   ifTrue: [anObject]
		ifFalse: [anObject ___value].

	^value > val
%
category: 'Python'
method: float
__int__
	^self __trunc__
%
category: 'Python'
method: float
__mod__: anObject
	| val |
	val := (anObject isKindOf: Number)
	   ifTrue: [anObject]
		ifFalse: [anObject ___value].

	^self class ___new__init__: (value rem: val)
%
category: 'Python'
method: float
__mul__: anObject
	| val |
	val := (anObject isKindOf: Number)
	   ifTrue: [anObject]
		ifFalse: [anObject ___value].

	^self class ___new__init__: value * val _: 10
%
category: 'Python'
method: float
__neg__
	^self class ___new__init__: value negated
%
category: 'Python'
method: float
__pos__
	^self __abs__
%
category: 'Python'
method: float
__pow__: anObject
	| val |
	val := (anObject isKindOf: Number)
	   ifTrue: [anObject]
		ifFalse: [anObject ___value].

	^self class ___new__init__: (value raisedTo: val)
%
category: 'Python'
method: float
__rmul__: any

	(any isKindOf: Magnitude) ifFalse: [^self __rmul__: (self class ___new__init__: any)].
	^any __mul__: self
%
category: 'Python'
method: float
__round__
	^int ___new__init__: value rounded
%
category: 'Python'
method: float
__rtruediv__: any
	(any isKindOf: Magnitude)
		ifFalse: [^self __rtruediv__: (self class ___new__init__: any)].
	^any __truediv__: self
%
category: 'Python'
method: float
__sub__: anObject
	| val |
	val := (anObject isKindOf: Number)
	   ifTrue: [anObject]
		ifFalse: [anObject ___value].

	^self class ___new__init__: value - val
%
category: 'Python'
method: float
__truediv__: anObject
	| val |
	val := (anObject isKindOf: Number)
	   ifTrue: [anObject]
		ifFalse: [anObject ___value].

	^float ___new__init__: (value / val)
%
category: 'Python'
method: float
__trunc__
	^int ___new__init__: value truncated
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
	^self class ___new__init__: 0
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

	args  isEmpty ifTrue: [^self ___initialize: 0].
   ^self ___initialize: args first
%
category: 'Smalltalk'
method: float
___initialize: val

	value := val asFloat
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
