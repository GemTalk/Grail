! ===============================================================================
! NameErrorTestCase - Tests for Python NameError
! ===============================================================================

expectvalue /Metaclass3
doit
NameErrorTestCase removeAllMethods: 2.
NameErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-NameError'
method: NameErrorTestCase
test_inheritance
	"Test that NameError inherits from Exception."
	
	| exc |
	exc := NameError perform: #__new__: env: 2 withArguments: { NameError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-NameError'
method: NameErrorTestCase
test_creation
	"Test creating a NameError instance."
	
	| exc |
	exc := NameError perform: #__new__: env: 2 withArguments: { NameError }.
	self assert: exc notNil.
%
