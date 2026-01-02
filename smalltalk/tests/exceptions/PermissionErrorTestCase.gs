! ===============================================================================
! PermissionErrorTestCase - Tests for Python PermissionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PermissionErrorTestCase removeAllMethods.
PermissionErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-PermissionError'
method: PermissionErrorTestCase
test_inheritance
	"Test that PermissionError inherits from OSError."
	
	| exc |
	exc := PermissionError ___new___:  PermissionError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-PermissionError'
method: PermissionErrorTestCase
test_creation
	"Test creating a PermissionError instance."
	
	| exc |
	exc := PermissionError ___new___:  PermissionError .
	self assert: exc notNil.
%
