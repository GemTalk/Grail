! ------------------- Remove existing behavior from Singleton
removeAllMethods Singleton
removeAllClassMethods Singleton
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
