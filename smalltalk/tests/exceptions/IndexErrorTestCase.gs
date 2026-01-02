! ===============================================================================
! IndexErrorTestCase - Tests for Python IndexError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IndexErrorTestCase removeAllMethods.
IndexErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-IndexError'
method: IndexErrorTestCase
test_inheritance
	"Test that IndexError inherits from LookupError."
	
	| exc |
	exc := IndexError ___new___:  IndexError .
	self assert: (exc isKindOf: LookupError).
%

category: 'Python-Tests-IndexError'
method: IndexErrorTestCase
test_creation
	"Test creating a IndexError instance."
	
	| exc |
	exc := IndexError ___new___:  IndexError .
	self assert: exc notNil.
%
