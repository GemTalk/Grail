! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OSErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OSErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
OSErrorTestCase category: 'SUnit'
%

! ===============================================================================
! OSErrorTestCase - Tests for Python OSError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OSErrorTestCase removeAllMethods.
OSErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-OSError'
method: OSErrorTestCase
test_creation
	"Test creating a OSError instance."
	
	| exc |
	exc := OSError ___new___:  OSError .
	self assert: exc notNil.
%

category: 'Python-Tests-OSError'
method: OSErrorTestCase
test_inheritance
	"Test that OSError inherits from Exception."
	
	| exc |
	exc := OSError ___new___:  OSError .
	self assert: (exc isKindOf: Exception).
%
