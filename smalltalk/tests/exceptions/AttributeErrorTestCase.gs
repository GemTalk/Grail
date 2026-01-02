! ===============================================================================
! AttributeErrorTestCase - Tests for Python AttributeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeErrorTestCase removeAllMethods.
AttributeErrorTestCase class removeAllMethods.
%

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
