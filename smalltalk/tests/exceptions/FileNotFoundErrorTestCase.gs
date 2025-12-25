! ===============================================================================
! FileNotFoundErrorTestCase - Tests for Python FileNotFoundError
! ===============================================================================

expectvalue /Metaclass3
doit
FileNotFoundErrorTestCase removeAllMethods: 2.
FileNotFoundErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
