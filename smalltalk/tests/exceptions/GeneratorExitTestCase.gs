! ===============================================================================
! GeneratorExitTestCase - Tests for Python GeneratorExit
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorExitTestCase removeAllMethods.
GeneratorExitTestCase class removeAllMethods.
%

category: 'Python-Tests-GeneratorExit'
method: GeneratorExitTestCase
test_inheritance
	"Test that GeneratorExit inherits from BaseException."
	
	| exc |
	exc := GeneratorExit ___new___:  GeneratorExit .
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-GeneratorExit'
method: GeneratorExitTestCase
test_creation
	"Test creating a GeneratorExit instance."
	
	| exc |
	exc := GeneratorExit ___new___:  GeneratorExit .
	self assert: exc notNil.
%
