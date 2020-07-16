! ------------------- Remove existing behavior from PyNone
expectvalue /Metaclass3       
doit
PyNone removeAllMethods.
PyNone class removeAllMethods.
%
! ------------------- Class methods for PyNone
! ------------------- Instance methods for PyNone
set compile_env: 0
category: 'other'
method: PyNone
evaluate

	^nil
%
category: 'other'
method: PyNone
isNone

	^true
%
