! ===============================================================================
! AssertionErrorTestCase - Tests for Python AssertionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AssertionErrorTestCase removeAllMethods.
AssertionErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-AssertionError'
method: AssertionErrorTestCase
test_inheritance
	"Test that AssertionError inherits from Exception."
	
	| exc |
	exc := AssertionError ___new___: AssertionError.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-AssertionError'
method: AssertionErrorTestCase
test_creation
	"Test creating a AssertionError instance."
	
	| exc |
	exc := AssertionError ___new___: AssertionError.
	self assert: exc notNil.
%
