! ===============================================================================
! RecursionErrorTestCase - Tests for Python RecursionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RecursionErrorTestCase removeAllMethods.
RecursionErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-RecursionError'
method: RecursionErrorTestCase
test_inheritance
	"Test that RecursionError inherits from RuntimeError."

	| exc |
	exc := RecursionError ___new___:  RecursionError .
	self assert: (exc isKindOf: RuntimeError).
%

category: 'Python-Tests-RecursionError'
method: RecursionErrorTestCase
test_creation
	"Test creating a RecursionError instance."
	
	| exc |
	exc := RecursionError ___new___:  RecursionError .
	self assert: exc notNil.
%
