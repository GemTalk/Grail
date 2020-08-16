! ------------------- Remove existing behavior from Singleton
expectvalue /Metaclass3       
doit
Singleton removeAllMethods.
Singleton class removeAllMethods.
%
! ------------------- Class methods for Singleton
set compile_env: 0
category: 'other'
classmethod: Singleton
singleton

	singleton ifNil: [singleton := self new].
	^singleton
%
! ------------------- Instance methods for Singleton
set compile_env: 0
category: 'other'
method: Singleton
evaluate: aScope

	^self
%
