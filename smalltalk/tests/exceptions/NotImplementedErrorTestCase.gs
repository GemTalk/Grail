! ===============================================================================
! NotImplementedErrorTestCase - Tests for Python NotImplementedError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NotImplementedErrorTestCase removeAllMethods.
NotImplementedErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-NotImplementedError'
method: NotImplementedErrorTestCase
test_inheritance
	"Test that NotImplementedError inherits from RuntimeError."

	| exc |
	exc := NotImplementedError ___new___:  NotImplementedError .
	self assert: (exc isKindOf: RuntimeError).
%

category: 'Python-Tests-NotImplementedError'
method: NotImplementedErrorTestCase
test_creation
	"Test creating a NotImplementedError instance."
	
	| exc |
	exc := NotImplementedError ___new___:  NotImplementedError .
	self assert: exc notNil.
%
