! ===============================================================================
! MemoryErrorTestCase - Tests for Python MemoryError
! ===============================================================================

expectvalue /Metaclass3
doit
MemoryErrorTestCase removeAllMethods: 2.
MemoryErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-MemoryError'
method: MemoryErrorTestCase
test_inheritance
	"Test that MemoryError inherits from Exception."
	
	| exc |
	exc := MemoryError ___new___:  MemoryError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-MemoryError'
method: MemoryErrorTestCase
test_creation
	"Test creating a MemoryError instance."
	
	| exc |
	exc := MemoryError ___new___:  MemoryError .
	self assert: exc notNil.
%
