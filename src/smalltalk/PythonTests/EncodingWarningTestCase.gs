! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EncodingWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EncodingWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
EncodingWarningTestCase category: 'SUnit'
%

! ===============================================================================
! EncodingWarningTestCase - Tests for Python EncodingWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EncodingWarningTestCase removeAllMethods.
EncodingWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-EncodingWarning'
method: EncodingWarningTestCase
test_creation
	"Test creating a EncodingWarning instance."
	
	| exc |
	exc := EncodingWarning ___new___:  EncodingWarning .
	self assert: exc notNil.
%

category: 'Python-Tests-EncodingWarning'
method: EncodingWarningTestCase
test_inheritance
	"Test that EncodingWarning inherits from Warning."
	
	| exc |
	exc := EncodingWarning ___new___:  EncodingWarning .
	self assert: (exc isKindOf: Warning).
%
