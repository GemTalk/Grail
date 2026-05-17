! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MemoryErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MemoryErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
MemoryErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MemoryErrorTestCase - Tests for Python MemoryError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MemoryErrorTestCase removeAllMethods.
MemoryErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-MemoryError'
method: MemoryErrorTestCase
test_creation
	"Test creating a MemoryError instance."
	
	| exc |
	exc := MemoryError ___new___:  MemoryError .
	self assert: exc notNil.
%

category: 'Grail-Tests-MemoryError'
method: MemoryErrorTestCase
test_inheritance
	"Test that MemoryError inherits from Exception."
	
	| exc |
	exc := MemoryError ___new___:  MemoryError .
	self assert: (exc isKindOf: Exception).
%
