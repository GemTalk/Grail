! ===============================================================================
! ConnectionAbortedErrorTestCase - Tests for Python ConnectionAbortedError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ConnectionAbortedErrorTestCase removeAllMethods.
ConnectionAbortedErrorTestCase class removeAllMethods.
%

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
