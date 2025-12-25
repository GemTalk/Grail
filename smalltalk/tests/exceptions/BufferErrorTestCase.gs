! ===============================================================================
! BufferErrorTestCase - Tests for Python BufferError
! ===============================================================================

expectvalue /Metaclass3
doit
BufferErrorTestCase removeAllMethods: 2.
BufferErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
