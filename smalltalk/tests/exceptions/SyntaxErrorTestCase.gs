! ===============================================================================
! SyntaxErrorTestCase - Tests for Python SyntaxError
! ===============================================================================

expectvalue /Metaclass3
doit
SyntaxErrorTestCase removeAllMethods: 2.
SyntaxErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-SyntaxError'
method: SyntaxErrorTestCase
test_inheritance
	"Test that SyntaxError inherits from Exception."
	
	| exc |
	exc := SyntaxError ___new___:  SyntaxError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-SyntaxError'
method: SyntaxErrorTestCase
test_creation
	"Test creating a SyntaxError instance."
	
	| exc |
	exc := SyntaxError ___new___:  SyntaxError .
	self assert: exc notNil.
%
