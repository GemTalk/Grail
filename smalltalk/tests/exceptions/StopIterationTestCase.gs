! ===============================================================================
! StopIterationTestCase - Tests for Python StopIteration
! ===============================================================================

expectvalue /Metaclass3
doit
StopIterationTestCase removeAllMethods: 2.
StopIterationTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-StopIteration'
method: StopIterationTestCase
test_inheritance
	"Test that StopIteration inherits from Exception."
	
	| exc |
	exc := StopIteration perform: #__new__: env: 2 withArguments: { StopIteration }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-StopIteration'
method: StopIterationTestCase
test_creation
	"Test creating a StopIteration instance."
	
	| exc |
	exc := StopIteration perform: #__new__: env: 2 withArguments: { StopIteration }.
	self assert: exc notNil.
%
