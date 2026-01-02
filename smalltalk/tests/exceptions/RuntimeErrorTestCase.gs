! ===============================================================================
! RuntimeErrorTestCase - Tests for Python RuntimeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RuntimeErrorTestCase removeAllMethods.
RuntimeErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-RuntimeError'
method: RuntimeErrorTestCase
test_inheritance
	"Test that RuntimeError inherits from Exception."
	
	| exc |
	exc := RuntimeError ___new___:  RuntimeError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-RuntimeError'
method: RuntimeErrorTestCase
test_creation
	"Test creating a RuntimeError instance."
	
	| exc |
	exc := RuntimeError ___new___:  RuntimeError .
	self assert: exc notNil.
%
