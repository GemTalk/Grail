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
