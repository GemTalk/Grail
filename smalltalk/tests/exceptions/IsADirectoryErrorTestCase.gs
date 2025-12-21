! ===============================================================================
! IsADirectoryErrorTestCase - Tests for Python IsADirectoryError
! ===============================================================================

expectvalue /Metaclass3
doit
IsADirectoryErrorTestCase removeAllMethods: 2.
IsADirectoryErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-IsADirectoryError'
method: IsADirectoryErrorTestCase
test_inheritance
	"Test that IsADirectoryError inherits from OSError."
	
	| exc |
	exc := IsADirectoryError perform: #__new__: env: 2 withArguments: { IsADirectoryError }.
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-IsADirectoryError'
method: IsADirectoryErrorTestCase
test_creation
	"Test creating a IsADirectoryError instance."
	
	| exc |
	exc := IsADirectoryError perform: #__new__: env: 2 withArguments: { IsADirectoryError }.
	self assert: exc notNil.
%
