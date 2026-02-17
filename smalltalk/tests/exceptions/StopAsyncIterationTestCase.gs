! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StopAsyncIterationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StopAsyncIterationTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
StopAsyncIterationTestCase category: 'SUnit'
%

! ===============================================================================
! StopAsyncIterationTestCase - Tests for Python StopAsyncIteration
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StopAsyncIterationTestCase removeAllMethods.
StopAsyncIterationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-StopAsyncIteration'
method: StopAsyncIterationTestCase
test_creation
	"Test creating a StopAsyncIteration instance."
	
	| exc |
	exc := StopAsyncIteration ___new___:  StopAsyncIteration .
	self assert: exc notNil.
%

category: 'Python-Tests-StopAsyncIteration'
method: StopAsyncIterationTestCase
test_inheritance
	"Test that StopAsyncIteration inherits from Exception."
	
	| exc |
	exc := StopAsyncIteration ___new___:  StopAsyncIteration .
	self assert: (exc isKindOf: Exception).
%
