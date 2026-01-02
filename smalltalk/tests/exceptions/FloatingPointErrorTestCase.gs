! ===============================================================================
! FloatingPointErrorTestCase - Tests for Python FloatingPointError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FloatingPointErrorTestCase removeAllMethods.
FloatingPointErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-FloatingPointError'
method: FloatingPointErrorTestCase
test_inheritance
	"Test that FloatingPointError inherits from Exception."
	
	| exc |
	exc := FloatingPointError ___new___:  FloatingPointError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-FloatingPointError'
method: FloatingPointErrorTestCase
test_creation
	"Test creating a FloatingPointError instance."
	
	| exc |
	exc := FloatingPointError ___new___:  FloatingPointError .
	self assert: exc notNil.
%
