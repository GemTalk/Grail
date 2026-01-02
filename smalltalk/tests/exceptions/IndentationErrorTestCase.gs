! ===============================================================================
! IndentationErrorTestCase - Tests for Python IndentationError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IndentationErrorTestCase removeAllMethods.
IndentationErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-IndentationError'
method: IndentationErrorTestCase
test_inheritance
	"Test that IndentationError inherits from SyntaxError."
	
	| exc |
	exc := IndentationError ___new___:  IndentationError .
	self assert: (exc isKindOf: SyntaxError).
%

category: 'Python-Tests-IndentationError'
method: IndentationErrorTestCase
test_creation
	"Test creating a IndentationError instance."
	
	| exc |
	exc := IndentationError ___new___:  IndentationError .
	self assert: exc notNil.
%
