! ===============================================================================
! AssertionErrorTestCase - Tests for Python AssertionError
! ===============================================================================

expectvalue /Metaclass3
doit
AssertionErrorTestCase removeAllMethods: 2.
AssertionErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
