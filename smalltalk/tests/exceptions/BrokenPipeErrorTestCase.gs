! ===============================================================================
! BrokenPipeErrorTestCase - Tests for Python BrokenPipeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BrokenPipeErrorTestCase removeAllMethods.
BrokenPipeErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-BrokenPipeError'
method: BrokenPipeErrorTestCase
test_inheritance
	"Test that BrokenPipeError inherits from ConnectionError."
	
	| exc |
	exc := BrokenPipeError ___new___:  BrokenPipeError .
	self assert: (exc isKindOf: ConnectionError).
%

category: 'Python-Tests-BrokenPipeError'
method: BrokenPipeErrorTestCase
test_creation
	"Test creating a BrokenPipeError instance."
	
	| exc |
	exc := BrokenPipeError ___new___:  BrokenPipeError .
	self assert: exc notNil.
%
