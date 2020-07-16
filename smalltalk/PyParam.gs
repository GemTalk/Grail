! ------------------- Remove existing behavior from PyParam
expectvalue /Metaclass3       
doit
PyParam removeAllMethods.
PyParam class removeAllMethods.
%
! ------------------- Class methods for PyParam
! ------------------- Instance methods for PyParam
set compile_env: 0
category: 'other'
method: PyParam
initialize

	self halt.
	super initialize.
%
