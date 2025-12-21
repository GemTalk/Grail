! ===============================================================================
! ExceptionTestCase - Tests for Python Exception
! ===============================================================================

expectvalue /Metaclass3
doit
ExceptionTestCase removeAllMethods: 2.
ExceptionTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-Exception'
method: ExceptionTestCase
test_inheritance
	"Test that Exception inherits from BaseException."
	
	| exc |
	exc := Exception perform: #__new__: env: 2 withArguments: { Exception }.
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-Exception'
method: ExceptionTestCase
test_creation
	"Test creating a Exception instance."
	
	| exc |
	exc := Exception perform: #__new__: env: 2 withArguments: { Exception }.
	self assert: exc notNil.
%
