! ------------------- Remove existing behavior from NoneType
removeAllMethods NoneType
removeAllClassMethods NoneType
! ------------------- Class methods for NoneType
! ------------------- Instance methods for NoneType
set compile_env: 0
category: 'other'
method: NoneType
isNone

	^true
%
set compile_env: 0
category: 'Python'
method: NoneType
__bool__

	^false
%
