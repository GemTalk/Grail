! ------------------- Remove existing behavior from PyLt
expectvalue /Metaclass3       
doit
PyLt removeAllMethods.
PyLt class removeAllMethods.
%
! ------------------- Class methods for PyLt
! ------------------- Instance methods for PyLt
set compile_env: 0
category: 'other'
method: PyLt
left: left right: right
	^left < right
%
