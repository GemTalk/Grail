! ===============================================================================
! RuntimeErrorTestCase - Tests for Python RuntimeError
! ===============================================================================

expectvalue /Metaclass3
doit
RuntimeErrorTestCase removeAllMethods: 2.
RuntimeErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-RuntimeError'
method: RuntimeErrorTestCase
test_inheritance
	"Test that RuntimeError inherits from Exception."
	
	| exc |
	exc := RuntimeError perform: #__new__: env: 2 withArguments: { RuntimeError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-RuntimeError'
method: RuntimeErrorTestCase
test_creation
	"Test creating a RuntimeError instance."
	
	| exc |
	exc := RuntimeError perform: #__new__: env: 2 withArguments: { RuntimeError }.
	self assert: exc notNil.
%
