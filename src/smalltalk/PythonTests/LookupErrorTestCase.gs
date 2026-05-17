! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for LookupErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'LookupErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
LookupErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! LookupErrorTestCase - Tests for Python LookupError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
LookupErrorTestCase removeAllMethods.
LookupErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-LookupError'
method: LookupErrorTestCase
test_creation
	"Test creating a LookupError instance."
	
	| exc |
	exc := LookupError ___new___:  LookupError .
	self assert: exc notNil.
%

category: 'Grail-Tests-LookupError'
method: LookupErrorTestCase
test_inheritance
	"Test that LookupError inherits from Exception."
	
	| exc |
	exc := LookupError ___new___:  LookupError .
	self assert: (exc isKindOf: Exception).
%
