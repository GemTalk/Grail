! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ArithmeticErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ArithmeticErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ArithmeticErrorTestCase category: 'SUnit'
%

! ===============================================================================
! ArithmeticErrorTestCase - Tests for Python ArithmeticError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ArithmeticErrorTestCase removeAllMethods.
ArithmeticErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ArithmeticError'
method: ArithmeticErrorTestCase
test_creation
	"Test creating a ArithmeticError instance."
	
	| exc |
	exc := ArithmeticError ___new___: ArithmeticError.
	self assert: exc notNil.
%

category: 'Python-Tests-ArithmeticError'
method: ArithmeticErrorTestCase
test_inheritance
	"Test that ArithmeticError inherits from Exception."
	
	| exc |
	exc := ArithmeticError ___new___: ArithmeticError.
	self assert: (exc isKindOf: Exception).
%
