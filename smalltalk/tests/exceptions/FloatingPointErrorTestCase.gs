! ===============================================================================
! FloatingPointErrorTestCase - Tests for Python FloatingPointError
! ===============================================================================

expectvalue /Metaclass3
doit
FloatingPointErrorTestCase removeAllMethods: 2.
FloatingPointErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
