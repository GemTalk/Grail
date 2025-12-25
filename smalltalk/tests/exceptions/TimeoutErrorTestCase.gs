! ===============================================================================
! TimeoutErrorTestCase - Tests for Python TimeoutError
! ===============================================================================

expectvalue /Metaclass3
doit
TimeoutErrorTestCase removeAllMethods: 2.
TimeoutErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-TimeoutError'
method: TimeoutErrorTestCase
test_inheritance
	"Test that TimeoutError inherits from OSError."
	
	| exc |
	exc := TimeoutError ___new___:  TimeoutError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-TimeoutError'
method: TimeoutErrorTestCase
test_creation
	"Test creating a TimeoutError instance."
	
	| exc |
	exc := TimeoutError ___new___:  TimeoutError .
	self assert: exc notNil.
%
