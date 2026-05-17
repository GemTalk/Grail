! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReferenceErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReferenceErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ReferenceErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReferenceErrorTestCase - Tests for Python ReferenceError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReferenceErrorTestCase removeAllMethods.
ReferenceErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ReferenceError'
method: ReferenceErrorTestCase
test_creation
	"Test creating a ReferenceError instance."
	
	| exc |
	exc := ReferenceError ___new___:  ReferenceError .
	self assert: exc notNil.
%

category: 'Grail-Tests-ReferenceError'
method: ReferenceErrorTestCase
test_inheritance
	"Test that ReferenceError inherits from Exception."
	
	| exc |
	exc := ReferenceError ___new___:  ReferenceError .
	self assert: (exc isKindOf: Exception).
%
