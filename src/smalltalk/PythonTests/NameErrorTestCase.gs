! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NameErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NameErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
NameErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NameErrorTestCase - Tests for Python NameError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NameErrorTestCase removeAllMethods.
NameErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-NameError'
method: NameErrorTestCase
test_creation
	"Test creating a NameError instance."
	
	| exc |
	exc := NameError ___new___:  NameError .
	self assert: exc notNil.
%

category: 'Grail-Tests-NameError'
method: NameErrorTestCase
test_inheritance
	"Test that NameError inherits from Exception."
	
	| exc |
	exc := NameError ___new___:  NameError .
	self assert: (exc isKindOf: Exception).
%
