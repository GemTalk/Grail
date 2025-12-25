! ===============================================================================
! RecursionErrorTestCase - Tests for Python RecursionError
! ===============================================================================

expectvalue /Metaclass3
doit
RecursionErrorTestCase removeAllMethods: 2.
RecursionErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
