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

	^[:n | int with: number abs]
%
category: 'Python'
method: int
__add__

	^ [ :aNumber | int with: (number + aNumber.number) ]
%
category: 'Python'
method: int
__and__

	^ [ :aNumber | int with: (number bitAnd: aNumber.number) ]
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
__eq__

	^ [ :aNumber | number = aNumber.number ifTrue: [ True ] ifFalse: [ False ] ]
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

	^ [ :aNumber | int with: (number // aNumber.number) ]
%
category: 'Python'
method: int
__getnewargs__

	self halt.
%
category: 'Python'
method: int
__gt__

	^ [ :aNumber | number > aNumber.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__gte__

	^ [ :aNumber | number >= aNumber.number ifTrue: [ True ] ifFalse: [ False ] ]
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

	^ [ :aNumber | int with: (number bitShift: aNumber.number) ]
%
category: 'Python'
method: int
__lt__

	^ [ :aNumber | number < aNumber.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__lte__

	^ [ :aNumber | number <= aNumber.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__mod__

	^ [ :aNumber | int with: (number rem: aNumber.number) ]
%
category: 'Python'
method: int
__ne__

	^ [ :aNumber | number ~~ aNumber.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'Python'
method: int
__neg__

	^[:n | int with: number negated]
%
category: 'Python'
method: int
__or__

	^ [ :aNumber | int with: (number bitOr: aNumber.number) ]
%
category: 'Python'
method: int
__pos__

	self halt.
%
category: 'Python'
method: int
__pow__

	^ [ :aNumber | int with: ( number raisedTo: aNumber.number ) ]
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

	^ [ :aNumber | int with: (number bitShift: aNumber.number negated ) ]
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

	^ [ :aNumber | int with: (number - aNumber.number) ]
%
category: 'Python'
method: int
__truediv__
"https://docs.python.org/3/library/operator.html#operator.truediv"

	^ [ :aNumber | float with: ( number / aNumber.number ) ]
%
category: 'Python'
method: int
__trunc__

	self halt.
%
category: 'Python'
method: int
__xor__

	^ [ :aNumber | int with: (number bitXor: aNumber.number) ]
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
