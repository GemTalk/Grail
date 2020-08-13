! ------------------- Remove existing behavior from int
expectvalue /Metaclass3       
doit
int removeAllMethods.
int class removeAllMethods.
%
! ------------------- Class methods for int
! ------------------- Instance methods for int
set compile_env: 0
category: 'other'
method: int
= anObject
"clunky implementation to avoid re-defining Array >> includes:"
	| res |
	res := ((self __eq__ value: anObject) == True).
	^ res
%
set compile_env: 0
category: 'Python'
method: int
__abs__

	^ [ :n | int with: number abs ]
%
category: 'Python'
method: int
__add__

	^ [ :lhs :rhs | int with: (lhs.number + rhs.number) ]
%
category: 'Python'
method: int
__and__

	^ [ :lhs :rhs | int with: ( lhs.number bitAnd: rhs.number ) ]
%
category: 'Python'
method: int
__bool__

	self halt.
%
category: 'Python'
method: int
__ceil__

	self halt.
%
category: 'Python'
method: int
__divmod__

	self halt.
%
category: 'Python'
method: int
__float__

	self halt.
%
category: 'Python'
method: int
__floor__

	self halt.
%
category: 'Python'
method: int
__floordiv__

	^ [ :lhs :rhs | int with: ( lhs.number // rhs.number ) ]
%
category: 'Python'
method: int
__getnewargs__

	self halt.
%
category: 'Python'
method: int
__gt__

	^ [ :lhs :rhs | lhs.number > rhs.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__gte__

	^ [ :lhs :rhs | lhs.number >= rhs.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__index__

	self halt.
%
category: 'Python'
method: int
__int__

	self halt.
%
category: 'Python'
method: int
__invert__

	self halt.
%
category: 'Python'
method: int
__lshift__

	^ [ :lhs :rhs | int with: ( lhs.number bitShift: rhs.number ) ]
%
category: 'Python'
method: int
__lt__

	^ [ :lhs :rhs | lhs.number < rhs.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__lte__

	^ [ :lhs :rhs | lhs.number <= rhs.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__mod__

	^ [ :lhs :rhs | 
		rhs.number = 0 ifTrue: [ ZeroDivisionError signal: 'modulo by zero' ].
		int with: ( lhs.number rem: rhs.number ) ]
%
category: 'Python'
method: int
__ne__

	^ [ :lhs :rhs | lhs.number ~~ rhs.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__neg__

	^ [ :n | int with: number negated ]
%
category: 'Python'
method: int
__or__

	^ [ :lhs :rhs | int with: ( lhs.number bitOr: rhs.number ) ]
%
category: 'Python'
method: int
__pos__

	self halt.
%
category: 'Python'
method: int
__pow__

	^ [ :lhs : rhs | int with: ( lhs.number raisedTo: rhs.number ) ]
%
category: 'Python'
method: int
__radd__

	self halt.
%
category: 'Python'
method: int
__rand__

	self halt.
%
category: 'Python'
method: int
__rdivmod__

	self halt.
%
category: 'Python'
method: int
__rfloordiv__

	self halt.
%
category: 'Python'
method: int
__rlshift__

	self halt.
%
category: 'Python'
method: int
__rmod__

	self halt.
%
category: 'Python'
method: int
__rmul__

	self halt.
%
category: 'Python'
method: int
__ror__

	self halt.
%
category: 'Python'
method: int
__round__

	self halt.
%
category: 'Python'
method: int
__rpow__

	self halt.
%
category: 'Python'
method: int
__rrshift__

	self halt.
%
category: 'Python'
method: int
__rshift__

	^ [ :lhs :rhs | int with: (lhs.number bitShift: rhs.number negated ) ]
%
category: 'Python'
method: int
__rsub__

	self halt.
%
category: 'Python'
method: int
__rtruediv__

	self halt.
%
category: 'Python'
method: int
__rxor__

	self halt.
%
category: 'Python'
method: int
__sub__

	^ [ :lhs :rhs | int with: ( lhs.number - rhs.number ) ]
%
category: 'Python'
method: int
__truediv__
"https://docs.python.org/3/library/operator.html#operator.truediv"

	^ [ :lhs :rhs | 
			rhs.number = 0 ifTrue: [ ZeroDivisionError signal: 'division by zero' ].
			float with: ( lhs.number / rhs.number ) ]
%
category: 'Python'
method: int
__trunc__

	self halt.
%
category: 'Python'
method: int
__xor__

	^ [ :lhs :rhs | int with: ( lhs.number bitXor: rhs.number ) ]
%
category: 'Python'
method: int
bit_length

	self halt.
%
category: 'Python'
method: int
conjugate

	self halt.
%
category: 'Python'
method: int
denominator

	self halt.
%
category: 'Python'
method: int
from_bytes

	self halt.
%
category: 'Python'
method: int
imag

	self halt.
%
category: 'Python'
method: int
numerator

	self halt.
%
category: 'Python'
method: int
real

	self halt.
%
category: 'Python'
method: int
to_bytes

	self halt.
%
