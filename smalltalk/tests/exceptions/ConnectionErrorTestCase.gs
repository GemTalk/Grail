! ===============================================================================
! ConnectionErrorTestCase - Tests for Python ConnectionError
! ===============================================================================

expectvalue /Metaclass3
doit
ConnectionErrorTestCase removeAllMethods: 2.
ConnectionErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-ConnectionError'
method: ConnectionErrorTestCase
test_inheritance
	"Test that ConnectionError inherits from OSError."
	
	| exc |
	exc := ConnectionError ___new___:  ConnectionError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-ConnectionError'
method: ConnectionErrorTestCase
test_creation
	"Test creating a ConnectionError instance."
	
	| exc |
	exc := ConnectionError ___new___:  ConnectionError .
	self assert: exc notNil.
%
