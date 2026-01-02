! ===============================================================================
! IsADirectoryErrorTestCase - Tests for Python IsADirectoryError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IsADirectoryErrorTestCase removeAllMethods.
IsADirectoryErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-IsADirectoryError'
method: IsADirectoryErrorTestCase
test_inheritance
	"Test that IsADirectoryError inherits from OSError."
	
	| exc |
	exc := IsADirectoryError ___new___:  IsADirectoryError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-IsADirectoryError'
method: IsADirectoryErrorTestCase
test_creation
	"Test creating a IsADirectoryError instance."
	
	| exc |
	exc := IsADirectoryError ___new___:  IsADirectoryError .
	self assert: exc notNil.
%
