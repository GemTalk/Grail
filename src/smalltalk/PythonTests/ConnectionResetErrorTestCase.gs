! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ConnectionResetErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ConnectionResetErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ConnectionResetErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ConnectionResetErrorTestCase - Tests for Python ConnectionResetError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ConnectionResetErrorTestCase removeAllMethods.
ConnectionResetErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ConnectionResetError'
method: ConnectionResetErrorTestCase
test_creation
	"Test creating a ConnectionResetError instance."
	
	| exc |
	exc := ConnectionResetError ___new___:  ConnectionResetError .
	self assert: exc notNil.
%

category: 'Grail-Tests-ConnectionResetError'
method: ConnectionResetErrorTestCase
test_inheritance
	"Test that ConnectionResetError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionResetError ___new___:  ConnectionResetError .
	self assert: (exc isKindOf: ConnectionError).
%
