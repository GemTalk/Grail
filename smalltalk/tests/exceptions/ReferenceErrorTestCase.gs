! ===============================================================================
! ReferenceErrorTestCase - Tests for Python ReferenceError
! ===============================================================================

expectvalue /Metaclass3
doit
ReferenceErrorTestCase removeAllMethods: 2.
ReferenceErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
