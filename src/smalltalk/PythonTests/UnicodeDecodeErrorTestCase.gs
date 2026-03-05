! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnicodeDecodeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeDecodeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnicodeDecodeErrorTestCase category: 'SUnit'
%

! ===============================================================================
! UnicodeDecodeErrorTestCase - Tests for Python UnicodeDecodeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeDecodeErrorTestCase removeAllMethods.
UnicodeDecodeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-UnicodeDecodeError'
method: UnicodeDecodeErrorTestCase
test_creation
	"Test creating a UnicodeDecodeError instance."
	
	| exc |
	exc := UnicodeDecodeError ___new___:  UnicodeDecodeError .
	self assert: exc notNil.
%

category: 'Python-Tests-UnicodeDecodeError'
method: UnicodeDecodeErrorTestCase
test_inheritance
	"Test that UnicodeDecodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeDecodeError ___new___:  UnicodeDecodeError .
	self assert: (exc isKindOf: UnicodeError).
%
