! ===============================================================================
! BufferErrorTestCase - Tests for Python BufferError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BufferErrorTestCase removeAllMethods.
BufferErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-BufferError'
method: BufferErrorTestCase
test_inheritance
	"Test that BufferError inherits from Exception."
	
	| exc |
	exc := BufferError ___new___:  BufferError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-BufferError'
method: BufferErrorTestCase
test_creation
	"Test creating a BufferError instance."
	
	| exc |
	exc := BufferError ___new___:  BufferError .
	self assert: exc notNil.
%
