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
__eq__

	^[:lhs :rhs | ((lhs isKindOf: AbstractNumber) and: [(rhs isKindOf: AbstractNumber) and: [lhs.number = rhs.number]]) 
		ifTrue: [ True ] 
		ifFalse: [ False ]]
%
category: 'Python'
method: AbstractNumber
__mul__

	^ [ :aNumber | self class with: (number * aNumber.number) ]
%
category: 'Python'
method: AbstractNumber
__str__

	^[str withAll: number printString]
%
category: 'Python'
method: AbstractNumber
__sub__

	^ [ :aNumber | self class with: (number - aNumber.number) ]
%
