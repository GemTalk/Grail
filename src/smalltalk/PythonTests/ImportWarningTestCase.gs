! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ImportWarningTestCase category: 'SUnit'
%

! ===============================================================================
! ImportWarningTestCase - Tests for Python ImportWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportWarningTestCase removeAllMethods.
ImportWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ImportWarning'
method: ImportWarningTestCase
test_creation
	"Test creating a ImportWarning instance."
	
	| exc |
	exc := ImportWarning ___new___:  ImportWarning .
	self assert: exc notNil.
%

category: 'Python-Tests-ImportWarning'
method: ImportWarningTestCase
test_inheritance
	"Test that ImportWarning inherits from Warning."
	
	| exc |
	exc := ImportWarning ___new___:  ImportWarning .
	self assert: (exc isKindOf: Warning).
%
