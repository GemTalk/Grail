! ===============================================================================
! TabErrorTestCase - Tests for Python TabError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TabErrorTestCase removeAllMethods.
TabErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-TabError'
method: TabErrorTestCase
test_inheritance
	"Test that TabError inherits from IndentationError."
	
	| exc |
	exc := TabError ___new___:  TabError .
	self assert: (exc isKindOf: IndentationError).
%

category: 'Python-Tests-TabError'
method: TabErrorTestCase
test_creation
	"Test creating a TabError instance."
	
	| exc |
	exc := TabError ___new___:  TabError .
	self assert: exc notNil.
%
