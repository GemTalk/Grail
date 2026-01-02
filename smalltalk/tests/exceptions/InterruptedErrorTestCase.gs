! ===============================================================================
! InterruptedErrorTestCase - Tests for Python InterruptedError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InterruptedErrorTestCase removeAllMethods.
InterruptedErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-InterruptedError'
method: InterruptedErrorTestCase
test_inheritance
	"Test that InterruptedError inherits from OSError."
	
	| exc |
	exc := InterruptedError ___new___:  InterruptedError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-InterruptedError'
method: InterruptedErrorTestCase
test_creation
	"Test creating a InterruptedError instance."
	
	| exc |
	exc := InterruptedError ___new___:  InterruptedError .
	self assert: exc notNil.
%
