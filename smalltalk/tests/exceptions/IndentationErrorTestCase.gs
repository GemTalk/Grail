! ===============================================================================
! IndentationErrorTestCase - Tests for Python IndentationError
! ===============================================================================

expectvalue /Metaclass3
doit
IndentationErrorTestCase removeAllMethods: 2.
IndentationErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-IndentationError'
method: IndentationErrorTestCase
test_inheritance
	"Test that IndentationError inherits from SyntaxError."
	
	| exc |
	exc := IndentationError perform: #__new__: env: 2 withArguments: { IndentationError }.
	self assert: (exc isKindOf: SyntaxError).
%

category: 'Python-Tests-IndentationError'
method: IndentationErrorTestCase
test_creation
	"Test creating a IndentationError instance."
	
	| exc |
	exc := IndentationError perform: #__new__: env: 2 withArguments: { IndentationError }.
	self assert: exc notNil.
%
