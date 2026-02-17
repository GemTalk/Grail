! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnicodeWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnicodeWarningTestCase category: 'SUnit'
%

! ===============================================================================
! UnicodeWarningTestCase - Tests for Python UnicodeWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeWarningTestCase removeAllMethods.
UnicodeWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-UnicodeWarning'
method: UnicodeWarningTestCase
test_creation
	"Test creating a UnicodeWarning instance."
	
	| exc |
	exc := UnicodeWarning ___new___:  UnicodeWarning .
	self assert: exc notNil.
%

category: 'Python-Tests-UnicodeWarning'
method: UnicodeWarningTestCase
test_inheritance
	"Test that UnicodeWarning inherits from Warning."
	
	| exc |
	exc := UnicodeWarning ___new___:  UnicodeWarning .
	self assert: (exc isKindOf: Warning).
%
