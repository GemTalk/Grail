! ------------------- Remove existing behavior from bool
expectvalue /Metaclass3       
doit
bool removeAllMethods.
bool class removeAllMethods.
%
! ------------------- Class methods for bool
set compile_env: 0
category: 'other'
classmethod: bool
False

	f ifNil: [f := self with: 0].
	^f
%
category: 'other'
classmethod: bool
True

	t ifNil: [t := self with: 1].
	^t
%
! ------------------- Instance methods for bool
set compile_env: 0
category: 'overrides'
method: bool
printOn: aStream

	aStream nextPutAll: (number ~~ 0 ifTrue: ['True'] ifFalse: ['False'])
%
set compile_env: 0
category: 'Python'
method: bool
__str__

	^[str withAll: (number == 1 ifTrue: ['True'] ifFalse: ['False'])]
%
