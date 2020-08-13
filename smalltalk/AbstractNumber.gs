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
		initialize: aNumber;
		yourself
%
! ------------------- Instance methods for AbstractNumber
set compile_env: 0
category: 'other'
method: AbstractNumber
initialize: aNumber

	number := aNumber
%
category: 'other'
method: AbstractNumber
is_

	^ [ :anObject | number == anObject.number ifTrue: [ True ] ifFalse: [ False ] ]
%
category: 'other'
method: AbstractNumber
is_not

	^ [ :anObject | number ~~ anObject.number ifTrue: [ True ] ifFalse: [ False ] ]
%
