! ===============================================================================
! UnboundLocalErrorTestCase - Tests for Python UnboundLocalError
! ===============================================================================

expectvalue /Metaclass3
doit
UnboundLocalErrorTestCase removeAllMethods: 2.
UnboundLocalErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
