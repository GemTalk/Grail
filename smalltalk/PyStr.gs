! ------------------- Remove existing behavior from PyStr
expectvalue /Metaclass3       
doit
PyStr removeAllMethods.
PyStr class removeAllMethods.
%
! ------------------- Class methods for PyStr
! ------------------- Instance methods for PyStr
set compile_env: 0
category: 'other'
method: PyStr
evaluate
	^Py_String withAll: s
%
category: 'other'
method: PyStr
initialize
	"Str(string s) -- need to specify raw, unicode, etc?"

	s := self string.
	self readPosition.
%
