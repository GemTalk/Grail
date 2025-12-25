! ===============================================================================
! InterruptedErrorTestCase - Tests for Python InterruptedError
! ===============================================================================

expectvalue /Metaclass3
doit
InterruptedErrorTestCase removeAllMethods: 2.
InterruptedErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
