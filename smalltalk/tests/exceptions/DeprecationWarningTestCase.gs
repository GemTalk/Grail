! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DeprecationWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DeprecationWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
DeprecationWarningTestCase category: 'SUnit'
%

! ===============================================================================
! DeprecationWarningTestCase - Tests for Python DeprecationWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DeprecationWarningTestCase removeAllMethods.
DeprecationWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-DeprecationWarning'
method: DeprecationWarningTestCase
test_creation
	"Test creating a DeprecationWarning instance."
	
	| exc |
	exc := DeprecationWarning ___new___:  DeprecationWarning .
	self assert: exc notNil.
%

category: 'Python-Tests-DeprecationWarning'
method: DeprecationWarningTestCase
test_inheritance
	"Test that DeprecationWarning inherits from Warning."
	
	| exc |
	exc := DeprecationWarning ___new___:  DeprecationWarning .
	self assert: (exc isKindOf: Warning).
%
