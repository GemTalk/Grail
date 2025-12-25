! ===============================================================================
! AttributeErrorTestCase - Tests for Python AttributeError
! ===============================================================================

expectvalue /Metaclass3
doit
AttributeErrorTestCase removeAllMethods: 2.
AttributeErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-AttributeError'
method: AttributeErrorTestCase
test_inheritance
	"Test that AttributeError inherits from Exception."
	
	| exc |
	exc := AttributeError ___new___:  AttributeError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-AttributeError'
method: AttributeErrorTestCase
test_creation
	"Test creating a AttributeError instance."
	
	| exc |
	exc := AttributeError ___new___:  AttributeError .
	self assert: exc notNil.
%
