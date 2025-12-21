! ===============================================================================
! IndexErrorTestCase - Tests for Python IndexError
! ===============================================================================

expectvalue /Metaclass3
doit
IndexErrorTestCase removeAllMethods: 2.
IndexErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-IndexError'
method: IndexErrorTestCase
test_inheritance
	"Test that IndexError inherits from LookupError."
	
	| exc |
	exc := IndexError perform: #__new__: env: 2 withArguments: { IndexError }.
	self assert: (exc isKindOf: LookupError).
%

category: 'Python-Tests-IndexError'
method: IndexErrorTestCase
test_creation
	"Test creating a IndexError instance."
	
	| exc |
	exc := IndexError perform: #__new__: env: 2 withArguments: { IndexError }.
	self assert: exc notNil.
%
