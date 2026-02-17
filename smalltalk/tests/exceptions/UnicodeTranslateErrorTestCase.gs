! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnicodeTranslateErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeTranslateErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnicodeTranslateErrorTestCase category: 'SUnit'
%

! ===============================================================================
! UnicodeTranslateErrorTestCase - Tests for Python UnicodeTranslateError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeTranslateErrorTestCase removeAllMethods.
UnicodeTranslateErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-UnicodeTranslateError'
method: UnicodeTranslateErrorTestCase
test_creation
	"Test creating a UnicodeTranslateError instance."
	
	| exc |
	exc := UnicodeTranslateError ___new___:  UnicodeTranslateError .
	self assert: exc notNil.
%

category: 'Python-Tests-UnicodeTranslateError'
method: UnicodeTranslateErrorTestCase
test_inheritance
	"Test that UnicodeTranslateError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeTranslateError ___new___:  UnicodeTranslateError .
	self assert: (exc isKindOf: UnicodeError).
%
