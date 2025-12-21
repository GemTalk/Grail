! ===============================================================================
! ArithmeticErrorTestCase - Tests for Python ArithmeticError
! ===============================================================================

expectvalue /Metaclass3
doit
ArithmeticErrorTestCase removeAllMethods: 2.
ArithmeticErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-ArithmeticError'
method: ArithmeticErrorTestCase
test_inheritance
	"Test that ArithmeticError inherits from Exception."
	
	| exc |
	exc := ArithmeticError perform: #__new__: env: 2 withArguments: { ArithmeticError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-ArithmeticError'
method: ArithmeticErrorTestCase
test_creation
	"Test creating a ArithmeticError instance."
	
	| exc |
	exc := ArithmeticError perform: #__new__: env: 2 withArguments: { ArithmeticError }.
	self assert: exc notNil.
%
