! ===============================================================================
! ModuleNotFoundErrorTestCase - Tests for Python ModuleNotFoundError
! ===============================================================================

expectvalue /Metaclass3
doit
ModuleNotFoundErrorTestCase removeAllMethods: 2.
ModuleNotFoundErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-ModuleNotFoundError'
method: ModuleNotFoundErrorTestCase
test_inheritance
	"Test that ModuleNotFoundError inherits from ImportError."
	
	| exc |
	exc := ModuleNotFoundError perform: #__new__: env: 2 withArguments: { ModuleNotFoundError }.
	self assert: (exc isKindOf: ImportError).
%

category: 'Python-Tests-ModuleNotFoundError'
method: ModuleNotFoundErrorTestCase
test_creation
	"Test creating a ModuleNotFoundError instance."
	
	| exc |
	exc := ModuleNotFoundError perform: #__new__: env: 2 withArguments: { ModuleNotFoundError }.
	self assert: exc notNil.
%
