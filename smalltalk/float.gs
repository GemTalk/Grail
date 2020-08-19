! ------------------- Remove existing behavior from float
expectvalue /Metaclass3       
doit
float removeAllMethods.
float class removeAllMethods.
%
! ------------------- Class methods for float
set compile_env: 0
category: 'other'
classmethod: float
_generality

	^ 100
%
category: 'other'
classmethod: float
withString: anObject

	(anObject isKindOf: str) ifFalse: [ self halt ].
	^ (str parseFloat: anObject ___container) asFloat
%
! ------------------- Instance methods for float
set compile_env: 0
category: 'other'
method: float
___initialize: anObject

	(anObject isKindOf: str) 
		ifTrue: [ number := float withString: anObject ]
		ifFalse: [ number := anObject ]
%
category: 'other'
method: float
_coerce: aNumber

	^ float with: aNumber
%
category: 'other'
method: float
_generality

	^ 100
%
set compile_env: 0
category: 'Python'
method: float
__abs__

	self halt.
%
category: 'Python'
method: float
__add__

	self halt.
%
category: 'Python'
method: float
__bool__

	self halt.
%
category: 'Python'
method: float
__divmod__

	self halt.
%
category: 'Python'
method: float
__float__

	^ [ :anObject | float with: anObject ]
%
category: 'Python'
method: float
__floordiv__

	self halt.
%
category: 'Python'
method: float
__getformat__

	self halt.
%
category: 'Python'
method: float
__getnewargs__

	self halt.
%
category: 'Python'
method: float
__int__

	^ [ :obj | obj ___number // 1 ]
%
category: 'Python'
method: float
__mod__

	self halt.
%
category: 'Python'
method: float
__neg__

	^ [ :value | float with: value ___number * -1 ]
%
category: 'Python'
method: float
__pos__

	self halt.
%
category: 'Python'
method: float
__pow__

	self halt.
%
category: 'Python'
method: float
__radd__

	self halt.
%
category: 'Python'
method: float
__rdivmod__

	self halt.
%
category: 'Python'
method: float
__rfloordiv__

	self halt.
%
category: 'Python'
method: float
__rmod__

	self halt.
%
category: 'Python'
method: float
__rmul__

	self halt.
%
category: 'Python'
method: float
__round__

	self halt.
%
category: 'Python'
method: float
__rpow__

	self halt.
%
category: 'Python'
method: float
__rsub__

	self halt.
%
category: 'Python'
method: float
__rtruediv__

	self halt.
%
category: 'Python'
method: float
__set_format__

	self halt.
%
category: 'Python'
method: float
__truediv__

	^ [ :lhs :rhs | 
			rhs.number = 0 ifTrue: [ ZeroDivisionError signal: 'division by zero' ].
			float with: ( lhs.number / rhs.number ) ]
%
category: 'Python'
method: float
__trunc__

	self halt.
%
category: 'Python'
method: float
as_integer_ratio

	self halt.
%
category: 'Python'
method: float
conjugate

	self halt.
%
category: 'Python'
method: float
fromhex

	self halt.
%
category: 'Python'
method: float
hex

	self halt.
%
category: 'Python'
method: float
imag

	self halt.
%
category: 'Python'
method: float
is_integer

	self halt.
%
category: 'Python'
method: float
real

	self halt.
%
