! ===============================================================================
! NotADirectoryErrorTestCase - Tests for Python NotADirectoryError
! ===============================================================================

expectvalue /Metaclass3
doit
NotADirectoryErrorTestCase removeAllMethods: 2.
NotADirectoryErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-NotADirectoryError'
method: NotADirectoryErrorTestCase
test_inheritance
	"Test that NotADirectoryError inherits from OSError."
	
	| exc |
	exc := NotADirectoryError ___new___:  NotADirectoryError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-NotADirectoryError'
method: NotADirectoryErrorTestCase
test_creation
	"Test creating a NotADirectoryError instance."
	
	| exc |
	exc := NotADirectoryError ___new___:  NotADirectoryError .
	self assert: exc notNil.
%
