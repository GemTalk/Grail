! ===============================================================================
! ConnectionResetErrorTestCase - Tests for Python ConnectionResetError
! ===============================================================================

expectvalue /Metaclass3
doit
ConnectionResetErrorTestCase removeAllMethods: 2.
ConnectionResetErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
