! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FloatingPointErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FloatingPointErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FloatingPointErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FloatingPointErrorTestCase - Tests for Python FloatingPointError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FloatingPointErrorTestCase removeAllMethods.
FloatingPointErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-FloatingPointError'
method: FloatingPointErrorTestCase
test_creation
	"Test creating a FloatingPointError instance."
	
	| exc |
	exc := FloatingPointError ___new___:  FloatingPointError .
	self assert: exc notNil.
%

category: 'Grail-Tests-FloatingPointError'
method: FloatingPointErrorTestCase
test_inheritance
	"Test that FloatingPointError inherits from Exception."
	
	| exc |
	exc := FloatingPointError ___new___:  FloatingPointError .
	self assert: (exc isKindOf: Exception).
%
