! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnicodeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
UnicodeErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnicodeErrorTestCase - Tests for Python UnicodeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeErrorTestCase removeAllMethods.
UnicodeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-UnicodeError'
method: UnicodeErrorTestCase
test_creation
	"Test creating a UnicodeError instance."
	
	| exc |
	exc := UnicodeError ___new___:  UnicodeError .
	self assert: exc notNil.
%

category: 'Grail-Tests-UnicodeError'
method: UnicodeErrorTestCase
test_inheritance
	"Test that UnicodeError inherits from ValueError."
	
	| exc |
	exc := UnicodeError ___new___:  UnicodeError .
	self assert: (exc isKindOf: ValueError).
%
