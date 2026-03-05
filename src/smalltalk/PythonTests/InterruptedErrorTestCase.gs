! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InterruptedErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InterruptedErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
InterruptedErrorTestCase category: 'SUnit'
%

! ===============================================================================
! InterruptedErrorTestCase - Tests for Python InterruptedError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InterruptedErrorTestCase removeAllMethods.
InterruptedErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-InterruptedError'
method: InterruptedErrorTestCase
test_creation
	"Test creating a InterruptedError instance."
	
	| exc |
	exc := InterruptedError ___new___:  InterruptedError .
	self assert: exc notNil.
%

category: 'Python-Tests-InterruptedError'
method: InterruptedErrorTestCase
test_inheritance
	"Test that InterruptedError inherits from OSError."
	
	| exc |
	exc := InterruptedError ___new___:  InterruptedError .
	self assert: (exc isKindOf: OSError).
%
