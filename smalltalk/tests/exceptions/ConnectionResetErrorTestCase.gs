! ===============================================================================
! ConnectionResetErrorTestCase - Tests for Python ConnectionResetError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ConnectionResetErrorTestCase removeAllMethods.
ConnectionResetErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ConnectionResetError'
method: ConnectionResetErrorTestCase
test_inheritance
	"Test that ConnectionResetError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionResetError ___new___:  ConnectionResetError .
	self assert: (exc isKindOf: ConnectionError).
%

category: 'Python-Tests-ConnectionResetError'
method: ConnectionResetErrorTestCase
test_creation
	"Test creating a ConnectionResetError instance."
	
	| exc |
	exc := ConnectionResetError ___new___:  ConnectionResetError .
	self assert: exc notNil.
%
