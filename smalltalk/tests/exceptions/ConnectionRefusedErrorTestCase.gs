! ===============================================================================
! ConnectionRefusedErrorTestCase - Tests for Python ConnectionRefusedError
! ===============================================================================

expectvalue /Metaclass3
doit
ConnectionRefusedErrorTestCase removeAllMethods: 2.
ConnectionRefusedErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-ConnectionRefusedError'
method: ConnectionRefusedErrorTestCase
test_inheritance
	"Test that ConnectionRefusedError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionRefusedError ___new___:  ConnectionRefusedError .
	self assert: (exc isKindOf: ConnectionError).
%

category: 'Python-Tests-ConnectionRefusedError'
method: ConnectionRefusedErrorTestCase
test_creation
	"Test creating a ConnectionRefusedError instance."
	
	| exc |
	exc := ConnectionRefusedError ___new___:  ConnectionRefusedError .
	self assert: exc notNil.
%
