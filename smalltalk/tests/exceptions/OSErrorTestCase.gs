! ===============================================================================
! OSErrorTestCase - Tests for Python OSError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OSErrorTestCase removeAllMethods.
OSErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-OSError'
method: OSErrorTestCase
test_inheritance
	"Test that OSError inherits from Exception."
	
	| exc |
	exc := OSError ___new___:  OSError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-OSError'
method: OSErrorTestCase
test_creation
	"Test creating a OSError instance."
	
	| exc |
	exc := OSError ___new___:  OSError .
	self assert: exc notNil.
%
