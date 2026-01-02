! ===============================================================================
! FileExistsErrorTestCase - Tests for Python FileExistsError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FileExistsErrorTestCase removeAllMethods.
FileExistsErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-FileExistsError'
method: FileExistsErrorTestCase
test_inheritance
	"Test that FileExistsError inherits from OSError."
	
	| exc |
	exc := FileExistsError ___new___:  FileExistsError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-FileExistsError'
method: FileExistsErrorTestCase
test_creation
	"Test creating a FileExistsError instance."
	
	| exc |
	exc := FileExistsError ___new___:  FileExistsError .
	self assert: exc notNil.
%
