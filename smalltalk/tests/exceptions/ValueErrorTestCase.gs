! ===============================================================================
! ValueErrorTestCase - Tests for Python ValueError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ValueErrorTestCase removeAllMethods.
ValueErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ValueError'
method: ValueErrorTestCase
test_inheritance
	"Test that ValueError inherits from Exception."
	
	| exc |
	exc := ValueError ___new___:  ValueError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-ValueError'
method: ValueErrorTestCase
test_creation
	"Test creating a ValueError instance."
	
	| exc |
	exc := ValueError ___new___:  ValueError .
	self assert: exc notNil.
%
