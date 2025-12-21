! ===============================================================================
! SystemErrorTestCase - Tests for Python SystemError
! ===============================================================================

expectvalue /Metaclass3
doit
SystemErrorTestCase removeAllMethods: 2.
SystemErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-SystemError'
method: SystemErrorTestCase
test_inheritance
	"Test that SystemError inherits from Exception."
	
	| exc |
	exc := SystemError perform: #__new__: env: 2 withArguments: { SystemError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-SystemError'
method: SystemErrorTestCase
test_creation
	"Test creating a SystemError instance."
	
	| exc |
	exc := SystemError perform: #__new__: env: 2 withArguments: { SystemError }.
	self assert: exc notNil.
%
