! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ImportErrorTestCase category: 'SUnit'
%

! ===============================================================================
! ImportErrorTestCase - Tests for Python ImportError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportErrorTestCase removeAllMethods.
ImportErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ImportError'
method: ImportErrorTestCase
test_creation
	"Test creating a ImportError instance."
	
	| exc |
	exc := ImportError ___new___:  ImportError .
	self assert: exc notNil.
%

category: 'Python-Tests-ImportError'
method: ImportErrorTestCase
test_inheritance
	"Test that ImportError inherits from Exception."
	
	| exc |
	exc := ImportError ___new___:  ImportError .
	self assert: (exc isKindOf: Exception).
%
