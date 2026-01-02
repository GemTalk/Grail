! ===============================================================================
! StopIterationTestCase - Tests for Python StopIteration
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StopIterationTestCase removeAllMethods.
StopIterationTestCase class removeAllMethods.
%

category: 'Python-Tests-StopIteration'
method: StopIterationTestCase
test_inheritance
	"Test that StopIteration inherits from Exception."
	
	| exc |
	exc := StopIteration ___new___:  StopIteration .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-StopIteration'
method: StopIterationTestCase
test_creation
	"Test creating a StopIteration instance."
	
	| exc |
	exc := StopIteration ___new___:  StopIteration .
	self assert: exc notNil.
%
