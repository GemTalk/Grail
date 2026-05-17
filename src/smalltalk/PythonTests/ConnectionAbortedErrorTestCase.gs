! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ConnectionAbortedErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ConnectionAbortedErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ConnectionAbortedErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ConnectionAbortedErrorTestCase - Tests for Python ConnectionAbortedError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ConnectionAbortedErrorTestCase removeAllMethods.
ConnectionAbortedErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ConnectionAbortedError'
method: ConnectionAbortedErrorTestCase
test_creation
	"Test creating a ConnectionAbortedError instance."
	
	| exc |
	exc := ConnectionAbortedError ___new___:  ConnectionAbortedError .
	self assert: exc notNil.
%

category: 'Grail-Tests-ConnectionAbortedError'
method: ConnectionAbortedErrorTestCase
test_inheritance
	"Test that ConnectionAbortedError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionAbortedError ___new___:  ConnectionAbortedError .
	self assert: (exc isKindOf: ConnectionError).
%
