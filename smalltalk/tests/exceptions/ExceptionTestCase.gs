! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptionTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ExceptionTestCase category: 'SUnit'
%

! ===============================================================================
! ExceptionTestCase - Tests for Python Exception
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExceptionTestCase removeAllMethods.
ExceptionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-Exception'
method: ExceptionTestCase
test_creation
	"Test creating a Exception instance."
	
	| exc |
	exc := Exception ___new___:  Exception .
	self assert: exc notNil.
%

category: 'Python-Tests-Exception'
method: ExceptionTestCase
test_inheritance
	"Test that Exception inherits from BaseException."
	
	| exc |
	exc := Exception ___new___:  Exception .
	self assert: (exc isKindOf: BaseException).
%
