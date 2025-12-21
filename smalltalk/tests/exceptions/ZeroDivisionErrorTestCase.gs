! ===============================================================================
! ZeroDivisionErrorTestCase - Tests for Python ZeroDivisionError
! ===============================================================================

expectvalue /Metaclass3
doit
ZeroDivisionErrorTestCase removeAllMethods: 2.
ZeroDivisionErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_inheritance
	"Test that ZeroDivisionError inherits from Exception."
	
	| exc |
	exc := ZeroDivisionError perform: #__new__: env: 2 withArguments: { ZeroDivisionError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_creation
	"Test creating a ZeroDivisionError instance."
	
	| exc |
	exc := ZeroDivisionError perform: #__new__: env: 2 withArguments: { ZeroDivisionError }.
	self assert: exc notNil.
%
