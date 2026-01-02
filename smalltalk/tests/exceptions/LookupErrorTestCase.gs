! ===============================================================================
! LookupErrorTestCase - Tests for Python LookupError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LookupErrorTestCase removeAllMethods.
LookupErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-LookupError'
method: LookupErrorTestCase
test_inheritance
	"Test that LookupError inherits from Exception."
	
	| exc |
	exc := LookupError ___new___:  LookupError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-LookupError'
method: LookupErrorTestCase
test_creation
	"Test creating a LookupError instance."
	
	| exc |
	exc := LookupError ___new___:  LookupError .
	self assert: exc notNil.
%
