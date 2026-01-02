! ===============================================================================
! ModuleNotFoundErrorTestCase - Tests for Python ModuleNotFoundError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleNotFoundErrorTestCase removeAllMethods.
ModuleNotFoundErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ModuleNotFoundError'
method: ModuleNotFoundErrorTestCase
test_inheritance
	"Test that ModuleNotFoundError inherits from ImportError."
	
	| exc |
	exc := ModuleNotFoundError ___new___:  ModuleNotFoundError .
	self assert: (exc isKindOf: ImportError).
%

category: 'Python-Tests-ModuleNotFoundError'
method: ModuleNotFoundErrorTestCase
test_creation
	"Test creating a ModuleNotFoundError instance."
	
	| exc |
	exc := ModuleNotFoundError ___new___:  ModuleNotFoundError .
	self assert: exc notNil.
%
