! ===============================================================================
! BlockingIOErrorTestCase - Tests for Python BlockingIOError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BlockingIOErrorTestCase removeAllMethods.
BlockingIOErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-BlockingIOError'
method: BlockingIOErrorTestCase
test_inheritance
	"Test that BlockingIOError inherits from OSError."
	
	| exc |
	exc := BlockingIOError ___new___:  BlockingIOError .
	self assert: (exc isKindOf: OSError).
%

category: 'Python-Tests-BlockingIOError'
method: BlockingIOErrorTestCase
test_creation
	"Test creating a BlockingIOError instance."
	
	| exc |
	exc := BlockingIOError ___new___:  BlockingIOError .
	self assert: exc notNil.
%
