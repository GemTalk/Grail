! ===============================================================================
! ProcessLookupErrorTestCase - Tests for Python ProcessLookupError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ProcessLookupErrorTestCase removeAllMethods.
ProcessLookupErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ProcessLookupError'
method: ProcessLookupErrorTestCase
test_inheritance
	"Test that ProcessLookupError inherits from OSError."
	
	| exc |
	exc := ProcessLookupError ___new___:  ProcessLookupError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-ProcessLookupError'
method: ProcessLookupErrorTestCase
test_creation
	"Test creating a ProcessLookupError instance."
	
	| exc |
	exc := ProcessLookupError ___new___:  ProcessLookupError .
	self assert: exc notNil.
%
