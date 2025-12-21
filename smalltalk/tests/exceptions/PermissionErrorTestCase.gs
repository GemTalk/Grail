! ===============================================================================
! PermissionErrorTestCase - Tests for Python PermissionError
! ===============================================================================

expectvalue /Metaclass3
doit
PermissionErrorTestCase removeAllMethods: 2.
PermissionErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-PermissionError'
method: PermissionErrorTestCase
test_inheritance
	"Test that PermissionError inherits from OSError."
	
	| exc |
	exc := PermissionError perform: #__new__: env: 2 withArguments: { PermissionError }.
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-PermissionError'
method: PermissionErrorTestCase
test_creation
	"Test creating a PermissionError instance."
	
	| exc |
	exc := PermissionError perform: #__new__: env: 2 withArguments: { PermissionError }.
	self assert: exc notNil.
%
