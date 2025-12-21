! ===============================================================================
! LookupErrorTestCase - Tests for Python LookupError
! ===============================================================================

expectvalue /Metaclass3
doit
LookupErrorTestCase removeAllMethods: 2.
LookupErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-LookupError'
method: LookupErrorTestCase
test_inheritance
	"Test that LookupError inherits from Exception."
	
	| exc |
	exc := LookupError perform: #__new__: env: 2 withArguments: { LookupError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-LookupError'
method: LookupErrorTestCase
test_creation
	"Test creating a LookupError instance."
	
	| exc |
	exc := LookupError perform: #__new__: env: 2 withArguments: { LookupError }.
	self assert: exc notNil.
%
