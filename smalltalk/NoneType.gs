! ------------------- Remove existing behavior from NoneType
expectvalue /Metaclass3       
doit
NoneType removeAllMethods.
NoneType class removeAllMethods.
%
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
