! ===============================================================================
! TypeErrorTestCase - Tests for Python TypeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeErrorTestCase removeAllMethods.
TypeErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-TypeError'
method: TypeErrorTestCase
test_inheritance
	"Test that TypeError inherits from Exception."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-TypeError'
method: TypeErrorTestCase
test_creation
	"Test creating a TypeError instance."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: exc notNil.
%
