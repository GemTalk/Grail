! ===============================================================================
! ChildProcessErrorTestCase - Tests for Python ChildProcessError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ChildProcessErrorTestCase removeAllMethods.
ChildProcessErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-ChildProcessError'
method: ChildProcessErrorTestCase
test_inheritance
	"Test that ChildProcessError inherits from OSError."
	
	| exc |
	exc := ChildProcessError ___new___:  ChildProcessError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-ChildProcessError'
method: ChildProcessErrorTestCase
test_creation
	"Test creating a ChildProcessError instance."
	
	| exc |
	exc := ChildProcessError ___new___:  ChildProcessError .
	self assert: exc notNil.
%
