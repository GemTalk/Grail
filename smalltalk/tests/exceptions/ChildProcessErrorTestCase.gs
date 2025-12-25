! ===============================================================================
! ChildProcessErrorTestCase - Tests for Python ChildProcessError
! ===============================================================================

expectvalue /Metaclass3
doit
ChildProcessErrorTestCase removeAllMethods: 2.
ChildProcessErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
