! ===============================================================================
! StopAsyncIterationTestCase - Tests for Python StopAsyncIteration
! ===============================================================================

expectvalue /Metaclass3
doit
StopAsyncIterationTestCase removeAllMethods: 2.
StopAsyncIterationTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-StopAsyncIteration'
method: StopAsyncIterationTestCase
test_inheritance
	"Test that StopAsyncIteration inherits from Exception."
	
	| exc |
	exc := StopAsyncIteration perform: #__new__: env: 2 withArguments: { StopAsyncIteration }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-StopAsyncIteration'
method: StopAsyncIterationTestCase
test_creation
	"Test creating a StopAsyncIteration instance."
	
	| exc |
	exc := StopAsyncIteration perform: #__new__: env: 2 withArguments: { StopAsyncIteration }.
	self assert: exc notNil.
%
