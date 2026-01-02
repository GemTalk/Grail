! ===============================================================================
! BaseExceptionGroupTestCase - Tests for Python BaseExceptionGroup
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BaseExceptionGroupTestCase removeAllMethods.
BaseExceptionGroupTestCase class removeAllMethods.
%

category: 'Python-Tests-BaseExceptionGroup'
method: BaseExceptionGroupTestCase
test_inheritance
	"Test that BaseExceptionGroup inherits from BaseException."
	
	| exc |
	exc := BaseExceptionGroup ___new___:  BaseExceptionGroup .
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-BaseExceptionGroup'
method: BaseExceptionGroupTestCase
test_creation
	"Test creating a BaseExceptionGroup instance."
	
	| exc |
	exc := BaseExceptionGroup ___new___:  BaseExceptionGroup .
	self assert: exc notNil.
%
