! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BytesWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BytesWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BytesWarningTestCase category: 'SUnit'
%

! ===============================================================================
! BytesWarningTestCase - Tests for Python BytesWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BytesWarningTestCase removeAllMethods.
BytesWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-BytesWarning'
method: BytesWarningTestCase
test_creation
	"Test creating a BytesWarning instance."
	
	| exc |
	exc := BytesWarning ___new___:  BytesWarning .
	self assert: exc notNil.
%

category: 'Python-Tests-BytesWarning'
method: BytesWarningTestCase
test_inheritance
	"Test that BytesWarning inherits from Warning."
	
	| exc |
	exc := BytesWarning ___new___:  BytesWarning .
	self assert: (exc isKindOf: Warning).
%
