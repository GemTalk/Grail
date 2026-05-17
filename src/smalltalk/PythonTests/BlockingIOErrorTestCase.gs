! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BlockingIOErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BlockingIOErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BlockingIOErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BlockingIOErrorTestCase - Tests for Python BlockingIOError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BlockingIOErrorTestCase removeAllMethods.
BlockingIOErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-BlockingIOError'
method: BlockingIOErrorTestCase
test_creation
	"Test creating a BlockingIOError instance."
	
	| exc |
	exc := BlockingIOError ___new___:  BlockingIOError .
	self assert: exc notNil.
%

category: 'Grail-Tests-BlockingIOError'
method: BlockingIOErrorTestCase
test_inheritance
	"Test that BlockingIOError inherits from OSError."
	
	| exc |
	exc := BlockingIOError ___new___:  BlockingIOError .
	self assert: (exc isKindOf: OSError).
%
