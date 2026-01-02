! ===============================================================================
! MemoryErrorTestCase - Tests for Python MemoryError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MemoryErrorTestCase removeAllMethods.
MemoryErrorTestCase class removeAllMethods.
%

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
