! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StopIterationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StopIterationTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
StopIterationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StopIterationTestCase - Tests for Python StopIteration
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StopIterationTestCase removeAllMethods.
StopIterationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-StopIteration'
method: StopIterationTestCase
test_creation
	"Test creating a StopIteration instance."
	
	| exc |
	exc := StopIteration ___new___:  StopIteration .
	self assert: exc notNil.
%

category: 'Grail-Tests-StopIteration'
method: StopIterationTestCase
test_inheritance
	"Test that StopIteration inherits from Exception."
	
	| exc |
	exc := StopIteration ___new___:  StopIteration .
	self assert: (exc isKindOf: Exception).
%
