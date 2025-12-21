! ===============================================================================
! GeneratorExitTestCase - Tests for Python GeneratorExit
! ===============================================================================

expectvalue /Metaclass3
doit
GeneratorExitTestCase removeAllMethods: 2.
GeneratorExitTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-GeneratorExit'
method: GeneratorExitTestCase
test_inheritance
	"Test that GeneratorExit inherits from BaseException."
	
	| exc |
	exc := GeneratorExit perform: #__new__: env: 2 withArguments: { GeneratorExit }.
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-GeneratorExit'
method: GeneratorExitTestCase
test_creation
	"Test creating a GeneratorExit instance."
	
	| exc |
	exc := GeneratorExit perform: #__new__: env: 2 withArguments: { GeneratorExit }.
	self assert: exc notNil.
%
