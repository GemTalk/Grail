! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UserWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UserWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UserWarningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UserWarningTestCase - Tests for Python UserWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UserWarningTestCase removeAllMethods.
UserWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-UserWarning'
method: UserWarningTestCase
test_creation
	"Test creating a UserWarning instance."
	
	| exc |
	exc := UserWarning ___new___:  UserWarning .
	self assert: exc notNil.
%

category: 'Grail-Tests-UserWarning'
method: UserWarningTestCase
test_inheritance
	"Test that UserWarning inherits from Warning."
	
	| exc |
	exc := UserWarning ___new___:  UserWarning .
	self assert: (exc isKindOf: Warning).
%
