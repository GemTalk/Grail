! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RuntimeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RuntimeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
RuntimeErrorTestCase category: 'SUnit'
%

! ===============================================================================
! RuntimeErrorTestCase - Tests for Python RuntimeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RuntimeErrorTestCase removeAllMethods.
RuntimeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-RuntimeError'
method: RuntimeErrorTestCase
test_creation
	"Test creating a RuntimeError instance."
	
	| exc |
	exc := RuntimeError ___new___:  RuntimeError .
	self assert: exc notNil.
%

category: 'Python-Tests-RuntimeError'
method: RuntimeErrorTestCase
test_inheritance
	"Test that RuntimeError inherits from Exception."
	
	| exc |
	exc := RuntimeError ___new___:  RuntimeError .
	self assert: (exc isKindOf: Exception).
%
