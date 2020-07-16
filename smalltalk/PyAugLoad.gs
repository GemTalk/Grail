! ------------------- Remove existing behavior from PyAugLoad
expectvalue /Metaclass3       
doit
PyAugLoad removeAllMethods.
PyAugLoad class removeAllMethods.
%
! ------------------- Class methods for PyAugLoad
! ------------------- Instance methods for PyAugLoad
set compile_env: 0
category: 'other'
method: PyAugLoad
initialize2

	super initialize2.
	parent saveVariableAssociation.
%
