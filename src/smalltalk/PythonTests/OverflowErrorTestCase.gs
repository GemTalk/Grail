! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OverflowErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OverflowErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
OverflowErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OverflowErrorTestCase - Tests for Python OverflowError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OverflowErrorTestCase removeAllMethods.
OverflowErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-OverflowError'
method: OverflowErrorTestCase
test_creation
	"Test creating a OverflowError instance."
	
	| exc |
	exc := OverflowError ___new___:  OverflowError .
	self assert: exc notNil.
%

category: 'Grail-Tests-OverflowError'
method: OverflowErrorTestCase
test_inheritance
	"Test that OverflowError inherits from ArithmeticError."
	
	| exc |
	exc := OverflowError ___new___:  OverflowError .
	self assert: (exc isKindOf: ArithmeticError).
%
