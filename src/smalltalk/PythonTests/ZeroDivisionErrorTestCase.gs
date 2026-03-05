! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ZeroDivisionErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ZeroDivisionErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ZeroDivisionErrorTestCase category: 'SUnit'
%

! ===============================================================================
! ZeroDivisionErrorTestCase - Tests for Python ZeroDivisionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ZeroDivisionErrorTestCase removeAllMethods.
ZeroDivisionErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_creation
	"Test creating a ZeroDivisionError instance."
	
	| exc |
	exc := ZeroDivisionError ___new___:  ZeroDivisionError .
	self assert: exc notNil.
%

category: 'Python-Tests-ZeroDivisionError'
method: ZeroDivisionErrorTestCase
test_inheritance
	"Test that ZeroDivisionError inherits from Exception."
	
	| exc |
	exc := ZeroDivisionError ___new___:  ZeroDivisionError .
	self assert: (exc isKindOf: Exception).
%
