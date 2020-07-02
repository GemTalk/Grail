! ------------------- Remove existing behavior from PythonTestCase
expectvalue /Metaclass3       
doit
PythonTestCase removeAllMethods.
PythonTestCase class removeAllMethods.
%
! ------------------- Class methods for PythonTestCase
! ------------------- Instance methods for PythonTestCase
set compile_env: 0
category: 'other'
method: PythonTestCase
filename

	self subclassResponsibility.
%
category: 'other'
method: PythonTestCase
setUp

	super setUp.
	statements := (PyModule script:  '$HOME/code/Python/GemStoneP/tests/' , self filename) _statements.
%
