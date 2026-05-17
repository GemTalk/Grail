! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NotImplementedErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NotImplementedErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
NotImplementedErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NotImplementedErrorTestCase - Tests for Python NotImplementedError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NotImplementedErrorTestCase removeAllMethods.
NotImplementedErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-NotImplementedError'
method: NotImplementedErrorTestCase
test_creation
	"Test creating a NotImplementedError instance."
	
	| exc |
	exc := NotImplementedError ___new___:  NotImplementedError .
	self assert: exc notNil.
%

category: 'Grail-Tests-NotImplementedError'
method: NotImplementedErrorTestCase
test_inheritance
	"Test that NotImplementedError inherits from RuntimeError."

	| exc |
	exc := NotImplementedError ___new___:  NotImplementedError .
	self assert: (exc isKindOf: RuntimeError).
%
