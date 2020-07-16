! ------------------- Remove existing behavior from PyStore
expectvalue /Metaclass3       
doit
PyStore removeAllMethods.
PyStore class removeAllMethods.
%
! ------------------- Class methods for PyStore
! ------------------- Instance methods for PyStore
set compile_env: 0
category: 'other'
method: PyStore
assertIsStore
	"Overide to avoid error"
%
category: 'other'
method: PyStore
initialize

	super initialize.
	parent saveVariableAssociation.
%
