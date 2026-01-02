! ===============================================================================
! ExceptionTestCase - Tests for Python Exception
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExceptionTestCase removeAllMethods.
ExceptionTestCase class removeAllMethods.
%

category: 'Python-Tests-Exception'
method: ExceptionTestCase
test_inheritance
	"Test that Exception inherits from BaseException."
	
	| exc |
	exc := Exception ___new___:  Exception .
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-Exception'
method: ExceptionTestCase
test_creation
	"Test creating a Exception instance."
	
	| exc |
	exc := Exception ___new___:  Exception .
	self assert: exc notNil.
%
