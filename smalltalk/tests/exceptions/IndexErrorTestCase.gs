! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IndexErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IndexErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
IndexErrorTestCase category: 'SUnit'
%

! ===============================================================================
! IndexErrorTestCase - Tests for Python IndexError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IndexErrorTestCase removeAllMethods.
IndexErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-IndexError'
method: IndexErrorTestCase
test_creation
	"Test creating a IndexError instance."
	
	| exc |
	exc := IndexError ___new___:  IndexError .
	self assert: exc notNil.
%

category: 'Python-Tests-IndexError'
method: IndexErrorTestCase
test_inheritance
	"Test that IndexError inherits from LookupError."
	
	| exc |
	exc := IndexError ___new___:  IndexError .
	self assert: (exc isKindOf: LookupError).
%
