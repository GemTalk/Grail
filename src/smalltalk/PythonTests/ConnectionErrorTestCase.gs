! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ConnectionErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ConnectionErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ConnectionErrorTestCase category: 'SUnit'
%

! ===============================================================================
! ConnectionErrorTestCase - Tests for Python ConnectionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ConnectionErrorTestCase removeAllMethods.
ConnectionErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ConnectionError'
method: ConnectionErrorTestCase
test_creation
	"Test creating a ConnectionError instance."
	
	| exc |
	exc := ConnectionError ___new___:  ConnectionError .
	self assert: exc notNil.
%

category: 'Python-Tests-ConnectionError'
method: ConnectionErrorTestCase
test_inheritance
	"Test that ConnectionError inherits from OSError."
	
	| exc |
	exc := ConnectionError ___new___:  ConnectionError .
	self assert: (exc isKindOf: OSError).
%
