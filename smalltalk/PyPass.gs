! ------------------- Remove existing behavior from PyPass
expectvalue /Metaclass3       
doit
PyPass removeAllMethods.
PyPass class removeAllMethods.
%
! ------------------- Class methods for PyPass
! ------------------- Instance methods for PyPass
set compile_env: 0
category: 'other'
method: PyPass
evaluate
	"This is a NULL operation"
%
category: 'other'
method: PyPass
initialize
	"pass"

	self readPositionOnly.
%
