! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
AttributeErrorTestCase category: 'SUnit'
%

! ===============================================================================
! AttributeErrorTestCase - Tests for Python AttributeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeErrorTestCase removeAllMethods.
AttributeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-AttributeError'
method: AttributeErrorTestCase
test_creation
	"Test creating a AttributeError instance."
	
	| exc |
	exc := AttributeError ___new___:  AttributeError .
	self assert: exc notNil.
%

category: 'Python-Tests-AttributeError'
method: AttributeErrorTestCase
test_inheritance
	"Test that AttributeError inherits from Exception."
	
	| exc |
	exc := AttributeError ___new___:  AttributeError .
	self assert: (exc isKindOf: Exception).
%
