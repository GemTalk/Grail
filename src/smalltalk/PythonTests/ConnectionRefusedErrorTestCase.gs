! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ConnectionRefusedErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ConnectionRefusedErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ConnectionRefusedErrorTestCase category: 'SUnit'
%

! ===============================================================================
! ConnectionRefusedErrorTestCase - Tests for Python ConnectionRefusedError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ConnectionRefusedErrorTestCase removeAllMethods.
ConnectionRefusedErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ConnectionRefusedError'
method: ConnectionRefusedErrorTestCase
test_creation
	"Test creating a ConnectionRefusedError instance."
	
	| exc |
	exc := ConnectionRefusedError ___new___:  ConnectionRefusedError .
	self assert: exc notNil.
%

category: 'Python-Tests-ConnectionRefusedError'
method: ConnectionRefusedErrorTestCase
test_inheritance
	"Test that ConnectionRefusedError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionRefusedError ___new___:  ConnectionRefusedError .
	self assert: (exc isKindOf: ConnectionError).
%
