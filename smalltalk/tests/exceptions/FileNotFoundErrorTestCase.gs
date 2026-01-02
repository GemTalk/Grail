! ===============================================================================
! FileNotFoundErrorTestCase - Tests for Python FileNotFoundError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FileNotFoundErrorTestCase removeAllMethods.
FileNotFoundErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-FileNotFoundError'
method: FileNotFoundErrorTestCase
test_inheritance
	"Test that FileNotFoundError inherits from OSError."
	
	| exc |
	exc := FileNotFoundError ___new___:  FileNotFoundError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-FileNotFoundError'
method: FileNotFoundErrorTestCase
test_creation
	"Test creating a FileNotFoundError instance."
	
	| exc |
	exc := FileNotFoundError ___new___:  FileNotFoundError .
	self assert: exc notNil.
%
