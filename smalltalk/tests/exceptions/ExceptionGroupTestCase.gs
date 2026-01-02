! ===============================================================================
! ExceptionGroupTestCase - Tests for Python ExceptionGroup
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExceptionGroupTestCase removeAllMethods.
ExceptionGroupTestCase class removeAllMethods.
%

category: 'Python-Tests-ExceptionGroup'
method: ExceptionGroupTestCase
test_inheritance
	"Test that ExceptionGroup inherits from BaseExceptionGroup."
	
	| exc |
	exc := ExceptionGroup ___new___:  ExceptionGroup .
	self assert: (exc isKindOf: BaseExceptionGroup).
%

category: 'Python-Tests-ExceptionGroup'
method: ExceptionGroupTestCase
test_creation
	"Test creating a ExceptionGroup instance."
	
	| exc |
	exc := ExceptionGroup ___new___:  ExceptionGroup .
	self assert: exc notNil.
%
