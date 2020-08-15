! ------------------- Remove existing behavior from AbstractNumber
expectvalue /Metaclass3       
doit
AbstractNumber removeAllMethods.
AbstractNumber class removeAllMethods.
%
! ------------------- Class methods for AbstractNumber
set compile_env: 0
category: 'other'
classmethod: AbstractNumber
with: aNumber

	^self basicNew
		___initialize: aNumber;
		yourself
%
! ------------------- Instance methods for AbstractNumber
set compile_env: 0
category: 'overrides'
method: AbstractNumber
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		print: number;
		nextPut: $);
		yourself.
%
set compile_env: 0
category: 'private'
method: AbstractNumber
___initialize: aNumber

	number := aNumber
%
category: 'private'
method: AbstractNumber
___number

	^number
%
set compile_env: 0
category: 'Python'
method: AbstractNumber
__bool__

	^ [ :rhs | rhs ___number = 0 ifTrue: [ False ] ifFalse: [ True ] ]
%
category: 'Python'
method: AbstractNumber
__eq__

	^ [ :lhs :rhs |
		| lnum rnum temp |
		lnum := lhs.
		rnum := rhs.
		(lhs isKindOf: AbstractNumber) ifTrue: [ lnum := lhs ___number ].
		(rhs isKindOf: AbstractNumber) ifTrue: [ rnum := rhs ___number ].
		(temp := (lhs == rhs)) ifTrue: [ True ] ifFalse: [ False ]
	]
%
category: 'Python'
method: AbstractNumber
__mul__

	^ [ :lhs :rhs | self class with: (lhs.number * rhs.number) ]
%
category: 'Python'
method: AbstractNumber
__str__

	^[:num | str withAll: num ___number printString]
%
category: 'Python'
method: AbstractNumber
__sub__

	^ [ :lhs :rhs | self class with: (lhs.number - rhs.number) ]
%
