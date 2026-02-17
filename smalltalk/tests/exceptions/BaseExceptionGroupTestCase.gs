! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BaseExceptionGroupTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BaseExceptionGroupTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BaseExceptionGroupTestCase category: 'SUnit'
%

! ===============================================================================
! BaseExceptionGroupTestCase - Tests for Python BaseExceptionGroup
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BaseExceptionGroupTestCase removeAllMethods.
BaseExceptionGroupTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-BaseExceptionGroup'
method: BaseExceptionGroupTestCase
test_creation
	"Test creating a BaseExceptionGroup instance."
	
	| exc |
	exc := BaseExceptionGroup ___new___:  BaseExceptionGroup .
	self assert: exc notNil.
%

category: 'Python-Tests-BaseExceptionGroup'
method: BaseExceptionGroupTestCase
test_inheritance
	"Test that BaseExceptionGroup inherits from BaseException."
	
	| exc |
	exc := BaseExceptionGroup ___new___:  BaseExceptionGroup .
	self assert: (exc isKindOf: BaseException).
%
