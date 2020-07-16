! ------------------- Remove existing behavior from PyDel
expectvalue /Metaclass3       
doit
PyDel removeAllMethods.
PyDel class removeAllMethods.
%
! ------------------- Class methods for PyDel
! ------------------- Instance methods for PyDel
set compile_env: 0
category: 'other'
method: PyDel
initialize2

	super initialize2.
	parent saveVariableAssociation.
%
