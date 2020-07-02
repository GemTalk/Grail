! ------------------- Remove existing behavior from PyExtSlice
expectvalue /Metaclass3       
doit
PyExtSlice removeAllMethods.
PyExtSlice class removeAllMethods.
%
! ------------------- Class methods for PyExtSlice
! ------------------- Instance methods for PyExtSlice
set compile_env: 0
category: 'other'
method: PyExtSlice
initialize
	"ExtSlice(slice* dims)"
	
	self halt.
%
