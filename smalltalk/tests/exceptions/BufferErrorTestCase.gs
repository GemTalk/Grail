! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BufferErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BufferErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BufferErrorTestCase category: 'SUnit'
%

! ===============================================================================
! BufferErrorTestCase - Tests for Python BufferError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BufferErrorTestCase removeAllMethods.
BufferErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-BufferError'
method: BufferErrorTestCase
test_creation
	"Test creating a BufferError instance."
	
	| exc |
	exc := BufferError ___new___:  BufferError .
	self assert: exc notNil.
%

category: 'Python-Tests-BufferError'
method: BufferErrorTestCase
test_inheritance
	"Test that BufferError inherits from Exception."
	
	| exc |
	exc := BufferError ___new___:  BufferError .
	self assert: (exc isKindOf: Exception).
%
