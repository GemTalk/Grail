! ===============================================================================
! ExceptionGroupTestCase - Tests for Python ExceptionGroup
! ===============================================================================

expectvalue /Metaclass3
doit
ExceptionGroupTestCase removeAllMethods: 2.
ExceptionGroupTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
