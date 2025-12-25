! ===============================================================================
! ProcessLookupErrorTestCase - Tests for Python ProcessLookupError
! ===============================================================================

expectvalue /Metaclass3
doit
ProcessLookupErrorTestCase removeAllMethods: 2.
ProcessLookupErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
