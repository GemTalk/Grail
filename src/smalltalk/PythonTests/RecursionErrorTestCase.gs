! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RecursionErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RecursionErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
RecursionErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! RecursionErrorTestCase - Tests for Python RecursionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RecursionErrorTestCase removeAllMethods.
RecursionErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
test_creation
	"Test creating a RecursionError instance."
	
	| exc |
	exc := RecursionError ___new___:  RecursionError .
	self assert: exc notNil.
%

category: 'Grail-Tests-RecursionError'
method: RecursionErrorTestCase
test_inheritance
	"Test that RecursionError inherits from RuntimeError."

	| exc |
	exc := RecursionError ___new___:  RecursionError .
	self assert: (exc isKindOf: RuntimeError).
%
