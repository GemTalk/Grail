! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
TypeErrorTestCase category: 'SUnit'
%

! ===============================================================================
! TypeErrorTestCase - Tests for Python TypeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeErrorTestCase removeAllMethods.
TypeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-TypeError'
method: TypeErrorTestCase
test_creation
	"Test creating a TypeError instance."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: exc notNil.
%

category: 'Python-Tests-TypeError'
method: TypeErrorTestCase
test_inheritance
	"Test that TypeError inherits from Exception."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: (exc isKindOf: Exception).
%
