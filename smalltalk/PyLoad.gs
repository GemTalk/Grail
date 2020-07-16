! ------------------- Remove existing behavior from PyLoad
expectvalue /Metaclass3       
doit
PyLoad removeAllMethods.
PyLoad class removeAllMethods.
%
! ------------------- Class methods for PyLoad
! ------------------- Instance methods for PyLoad
set compile_env: 0
category: 'other'
method: PyLoad
assertIsLoad
	"Override to avoid inherited error"
%
category: 'other'
method: PyLoad
initialize2

	super initialize2.
	parent saveVariableAssociation.
%
