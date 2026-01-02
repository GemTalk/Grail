! ===============================================================================
! ArithmeticErrorTestCase - Tests for Python ArithmeticError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ArithmeticErrorTestCase removeAllMethods.
ArithmeticErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ArithmeticError'
method: ArithmeticErrorTestCase
test_inheritance
	"Test that ArithmeticError inherits from Exception."
	
	| exc |
	exc := ArithmeticError ___new___: ArithmeticError.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-ArithmeticError'
method: ArithmeticErrorTestCase
test_creation
	"Test creating a ArithmeticError instance."
	
	| exc |
	exc := ArithmeticError ___new___: ArithmeticError.
	self assert: exc notNil.
%
