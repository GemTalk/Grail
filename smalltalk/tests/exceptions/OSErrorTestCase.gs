! ===============================================================================
! OSErrorTestCase - Tests for Python OSError
! ===============================================================================

expectvalue /Metaclass3
doit
OSErrorTestCase removeAllMethods: 2.
OSErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-OSError'
method: OSErrorTestCase
test_inheritance
	"Test that OSError inherits from Exception."
	
	| exc |
	exc := OSError perform: #__new__: env: 2 withArguments: { OSError }.
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-OSError'
method: OSErrorTestCase
test_creation
	"Test creating a OSError instance."
	
	| exc |
	exc := OSError perform: #__new__: env: 2 withArguments: { OSError }.
	self assert: exc notNil.
%
