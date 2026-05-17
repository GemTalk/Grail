! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FutureWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FutureWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FutureWarningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FutureWarningTestCase - Tests for Python FutureWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FutureWarningTestCase removeAllMethods.
FutureWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-FutureWarning'
method: FutureWarningTestCase
test_creation
	"Test creating a FutureWarning instance."
	
	| exc |
	exc := FutureWarning ___new___:  FutureWarning .
	self assert: exc notNil.
%

category: 'Grail-Tests-FutureWarning'
method: FutureWarningTestCase
test_inheritance
	"Test that FutureWarning inherits from Warning."
	
	| exc |
	exc := FutureWarning ___new___:  FutureWarning .
	self assert: (exc isKindOf: Warning).
%
