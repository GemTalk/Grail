! ===============================================================================
! NotImplementedErrorTestCase - Tests for Python NotImplementedError
! ===============================================================================

expectvalue /Metaclass3
doit
NotImplementedErrorTestCase removeAllMethods: 2.
NotImplementedErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
