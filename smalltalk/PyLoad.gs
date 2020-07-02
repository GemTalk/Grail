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
