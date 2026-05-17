! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RuntimeWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RuntimeWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
RuntimeWarningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RuntimeWarningTestCase - Tests for Python RuntimeWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RuntimeWarningTestCase removeAllMethods.
RuntimeWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-RuntimeWarning'
method: RuntimeWarningTestCase
test_creation
	"Test creating a RuntimeWarning instance."
	
	| exc |
	exc := RuntimeWarning ___new___:  RuntimeWarning .
	self assert: exc notNil.
%

category: 'Grail-Tests-RuntimeWarning'
method: RuntimeWarningTestCase
test_inheritance
	"Test that RuntimeWarning inherits from Warning."
	
	| exc |
	exc := RuntimeWarning ___new___:  RuntimeWarning .
	self assert: (exc isKindOf: Warning).
%
