! ------------------- Remove existing behavior from PyPackage
expectvalue /Metaclass3       
doit
PyPackage removeAllMethods.
PyPackage class removeAllMethods.
%
! ------------------- Class methods for PyPackage
! ------------------- Instance methods for PyPackage
set compile_env: 0
category: 'other'
method: PyPackage
load: aPathString as: aNameString

	super load: aPathString , '/__init__.py' as: aNameString.
	path := aPathString.
%
