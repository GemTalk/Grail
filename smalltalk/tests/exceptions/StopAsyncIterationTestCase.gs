! ===============================================================================
! StopAsyncIterationTestCase - Tests for Python StopAsyncIteration
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StopAsyncIterationTestCase removeAllMethods.
StopAsyncIterationTestCase class removeAllMethods.
%

category: 'Python-Tests-StopAsyncIteration'
method: StopAsyncIterationTestCase
test_inheritance
	"Test that StopAsyncIteration inherits from Exception."
	
	| exc |
	exc := StopAsyncIteration ___new___:  StopAsyncIteration .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-StopAsyncIteration'
method: StopAsyncIterationTestCase
test_creation
	"Test creating a StopAsyncIteration instance."
	
	| exc |
	exc := StopAsyncIteration ___new___:  StopAsyncIteration .
	self assert: exc notNil.
%
