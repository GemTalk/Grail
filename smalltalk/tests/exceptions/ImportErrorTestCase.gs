! ===============================================================================
! ImportErrorTestCase - Tests for Python ImportError
! ===============================================================================

expectvalue /Metaclass3
doit
ImportErrorTestCase removeAllMethods: 2.
ImportErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
