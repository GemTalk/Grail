! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnicodeEncodeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeEncodeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnicodeEncodeErrorTestCase category: 'SUnit'
%

! ===============================================================================
! UnicodeEncodeErrorTestCase - Tests for Python UnicodeEncodeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeEncodeErrorTestCase removeAllMethods.
UnicodeEncodeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-UnicodeEncodeError'
method: UnicodeEncodeErrorTestCase
test_creation
	"Test creating a UnicodeEncodeError instance."
	
	| exc |
	exc := UnicodeEncodeError ___new___:  UnicodeEncodeError .
	self assert: exc notNil.
%

category: 'Python-Tests-UnicodeEncodeError'
method: UnicodeEncodeErrorTestCase
test_inheritance
	"Test that UnicodeEncodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeEncodeError ___new___:  UnicodeEncodeError .
	self assert: (exc isKindOf: UnicodeError).
%
