! ===============================================================================
! ConnectionAbortedErrorTestCase - Tests for Python ConnectionAbortedError
! ===============================================================================

expectvalue /Metaclass3
doit
ConnectionAbortedErrorTestCase removeAllMethods: 2.
ConnectionAbortedErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-ConnectionAbortedError'
method: ConnectionAbortedErrorTestCase
test_inheritance
	"Test that ConnectionAbortedError inherits from ConnectionError."
	
	| exc |
	exc := ConnectionAbortedError ___new___:  ConnectionAbortedError .
	self assert: (exc isKindOf: ConnectionError).
%

category: 'Python-Tests-ConnectionAbortedError'
method: ConnectionAbortedErrorTestCase
test_creation
	"Test creating a ConnectionAbortedError instance."
	
	| exc |
	exc := ConnectionAbortedError ___new___:  ConnectionAbortedError .
	self assert: exc notNil.
%
