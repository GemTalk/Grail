! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ProcessLookupErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ProcessLookupErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ProcessLookupErrorTestCase category: 'SUnit'
%

! ===============================================================================
! ProcessLookupErrorTestCase - Tests for Python ProcessLookupError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ProcessLookupErrorTestCase removeAllMethods.
ProcessLookupErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ProcessLookupError'
method: ProcessLookupErrorTestCase
test_creation
	"Test creating a ProcessLookupError instance."
	
	| exc |
	exc := ProcessLookupError ___new___:  ProcessLookupError .
	self assert: exc notNil.
%

category: 'Python-Tests-ProcessLookupError'
method: ProcessLookupErrorTestCase
test_inheritance
	"Test that ProcessLookupError inherits from OSError."
	
	| exc |
	exc := ProcessLookupError ___new___:  ProcessLookupError .
	self assert: (exc isKindOf: OSError).
%
