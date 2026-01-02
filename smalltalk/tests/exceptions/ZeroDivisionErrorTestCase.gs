! ===============================================================================
! ZeroDivisionErrorTestCase - Tests for Python ZeroDivisionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ZeroDivisionErrorTestCase removeAllMethods.
ZeroDivisionErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_inheritance
	"Test that ZeroDivisionError inherits from Exception."
	
	| exc |
	exc := ZeroDivisionError ___new___:  ZeroDivisionError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_creation
	"Test creating a ZeroDivisionError instance."
	
	| exc |
	exc := ZeroDivisionError ___new___:  ZeroDivisionError .
	self assert: exc notNil.
%
