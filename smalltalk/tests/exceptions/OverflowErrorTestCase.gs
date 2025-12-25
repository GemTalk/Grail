! ===============================================================================
! OverflowErrorTestCase - Tests for Python OverflowError
! ===============================================================================

expectvalue /Metaclass3
doit
OverflowErrorTestCase removeAllMethods: 2.
OverflowErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-OverflowError'
method: OverflowErrorTestCase
test_inheritance
	"Test that OverflowError inherits from ArithmeticError."
	
	| exc |
	exc := OverflowError ___new___:  OverflowError .
	self assert: (exc isKindOf: ArithmeticError).
%

category: 'Python-Tests-OverflowError'
method: OverflowErrorTestCase
test_creation
	"Test creating a OverflowError instance."
	
	| exc |
	exc := OverflowError ___new___:  OverflowError .
	self assert: exc notNil.
%
