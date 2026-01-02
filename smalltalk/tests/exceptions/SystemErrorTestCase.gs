! ===============================================================================
! SystemErrorTestCase - Tests for Python SystemError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SystemErrorTestCase removeAllMethods.
SystemErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-SystemError'
method: SystemErrorTestCase
test_inheritance
	"Test that SystemError inherits from Exception."
	
	| exc |
	exc := SystemError ___new___:  SystemError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-SystemError'
method: SystemErrorTestCase
test_creation
	"Test creating a SystemError instance."
	
	| exc |
	exc := SystemError ___new___:  SystemError .
	self assert: exc notNil.
%
