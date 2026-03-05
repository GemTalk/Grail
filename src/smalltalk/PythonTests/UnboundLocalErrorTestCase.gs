! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnboundLocalErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnboundLocalErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnboundLocalErrorTestCase category: 'SUnit'
%

! ===============================================================================
! UnboundLocalErrorTestCase - Tests for Python UnboundLocalError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnboundLocalErrorTestCase removeAllMethods.
UnboundLocalErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-UnboundLocalError'
method: UnboundLocalErrorTestCase
test_creation
	"Test creating a UnboundLocalError instance."
	
	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: exc notNil.
%

category: 'Python-Tests-UnboundLocalError'
method: UnboundLocalErrorTestCase
test_inheritance
	"Test that UnboundLocalError inherits from NameError."
	
	| exc |
	exc := UnboundLocalError ___new___:  UnboundLocalError .
	self assert: (exc isKindOf: NameError).
%
