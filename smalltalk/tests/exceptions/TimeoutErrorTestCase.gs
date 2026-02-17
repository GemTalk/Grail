! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TimeoutErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TimeoutErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
TimeoutErrorTestCase category: 'SUnit'
%

! ===============================================================================
! TimeoutErrorTestCase - Tests for Python TimeoutError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TimeoutErrorTestCase removeAllMethods.
TimeoutErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-TimeoutError'
method: TimeoutErrorTestCase
test_creation
	"Test creating a TimeoutError instance."
	
	| exc |
	exc := TimeoutError ___new___:  TimeoutError .
	self assert: exc notNil.
%

category: 'Python-Tests-TimeoutError'
method: TimeoutErrorTestCase
test_inheritance
	"Test that TimeoutError inherits from OSError."
	
	| exc |
	exc := TimeoutError ___new___:  TimeoutError .
	self assert: (exc isKindOf: OSError).
%
