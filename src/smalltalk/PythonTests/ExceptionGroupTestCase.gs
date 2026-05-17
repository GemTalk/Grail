! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptionGroupTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptionGroupTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ExceptionGroupTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExceptionGroupTestCase - Tests for Python ExceptionGroup
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExceptionGroupTestCase removeAllMethods.
ExceptionGroupTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ExceptionGroup'
method: ExceptionGroupTestCase
test_creation
	"Test creating a ExceptionGroup instance."
	
	| exc |
	exc := ExceptionGroup ___new___:  ExceptionGroup .
	self assert: exc notNil.
%

category: 'Grail-Tests-ExceptionGroup'
method: ExceptionGroupTestCase
test_inheritance
	"Test that ExceptionGroup inherits from BaseExceptionGroup."
	
	| exc |
	exc := ExceptionGroup ___new___:  ExceptionGroup .
	self assert: (exc isKindOf: BaseExceptionGroup).
%
