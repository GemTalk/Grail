! ===============================================================================
! UnboundLocalErrorTestCase - Tests for Python UnboundLocalError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnboundLocalErrorTestCase removeAllMethods.
UnboundLocalErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-UnboundLocalError'
method: UnboundLocalErrorTestCase
test_inheritance
	"Test that UnboundLocalError inherits from NameError."
	
	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: (exc isKindOf: NameError).
%

category: 'Python-Tests-UnboundLocalError'
method: UnboundLocalErrorTestCase
test_creation
	"Test creating a UnboundLocalError instance."
	
	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: exc notNil.
%
