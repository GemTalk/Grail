! ------------------- Remove existing behavior from PyGt
expectvalue /Metaclass3       
doit
PyGt removeAllMethods.
PyGt class removeAllMethods.
%
! ------------------- Class methods for PyGt
! ------------------- Instance methods for PyGt
set compile_env: 0
category: 'other'
method: PyGt
left: left right: right
	^left > right
%
