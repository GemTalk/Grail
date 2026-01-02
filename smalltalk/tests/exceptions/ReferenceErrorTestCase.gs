! ===============================================================================
! ReferenceErrorTestCase - Tests for Python ReferenceError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReferenceErrorTestCase removeAllMethods.
ReferenceErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ReferenceError'
method: ReferenceErrorTestCase
test_inheritance
	"Test that ReferenceError inherits from Exception."
	
	| exc |
	exc := ReferenceError ___new___:  ReferenceError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-ReferenceError'
method: ReferenceErrorTestCase
test_creation
	"Test creating a ReferenceError instance."
	
	| exc |
	exc := ReferenceError ___new___:  ReferenceError .
	self assert: exc notNil.
%
