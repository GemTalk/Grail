! ===============================================================================
! FileExistsErrorTestCase - Tests for Python FileExistsError
! ===============================================================================

expectvalue /Metaclass3
doit
FileExistsErrorTestCase removeAllMethods: 2.
FileExistsErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
