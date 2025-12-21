! ===============================================================================
! BrokenPipeErrorTestCase - Tests for Python BrokenPipeError
! ===============================================================================

expectvalue /Metaclass3
doit
BrokenPipeErrorTestCase removeAllMethods: 2.
BrokenPipeErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-BrokenPipeError'
method: BrokenPipeErrorTestCase
test_inheritance
	"Test that BrokenPipeError inherits from ConnectionError."
	
	| exc |
	exc := BrokenPipeError perform: #__new__: env: 2 withArguments: { BrokenPipeError }.
	self assert: (exc isKindOf: ConnectionError).
%

category: 'Python-Tests-BrokenPipeError'
method: BrokenPipeErrorTestCase
test_creation
	"Test creating a BrokenPipeError instance."
	
	| exc |
	exc := BrokenPipeError perform: #__new__: env: 2 withArguments: { BrokenPipeError }.
	self assert: exc notNil.
%
