! ===============================================================================
! ImportErrorTestCase - Tests for Python ImportError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportErrorTestCase removeAllMethods.
ImportErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ImportError'
method: ImportErrorTestCase
test_inheritance
	"Test that ImportError inherits from Exception."
	
	| exc |
	exc := ImportError ___new___:  ImportError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-ImportError'
method: ImportErrorTestCase
test_creation
	"Test creating a ImportError instance."
	
	| exc |
	exc := ImportError ___new___:  ImportError .
	self assert: exc notNil.
%
