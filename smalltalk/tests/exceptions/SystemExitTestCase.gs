! ===============================================================================
! SystemExitTestCase - Tests for Python SystemExit
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SystemExitTestCase removeAllMethods.
SystemExitTestCase class removeAllMethods.
%

category: 'Python-Tests-SystemExit'
method: SystemExitTestCase
test_inheritance
	"Test that SystemExit inherits from BaseException."
	
	| exc |
	exc := SystemExit ___new___:  SystemExit .
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-SystemExit'
method: SystemExitTestCase
test_creation
	"Test creating a SystemExit instance."
	
	| exc |
	exc := SystemExit ___new___:  SystemExit .
	self assert: exc notNil.
%
