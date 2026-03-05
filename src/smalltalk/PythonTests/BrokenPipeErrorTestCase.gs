! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BrokenPipeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BrokenPipeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BrokenPipeErrorTestCase category: 'SUnit'
%

! ===============================================================================
! BrokenPipeErrorTestCase - Tests for Python BrokenPipeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BrokenPipeErrorTestCase removeAllMethods.
BrokenPipeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-BrokenPipeError'
method: BrokenPipeErrorTestCase
test_creation
	"Test creating a BrokenPipeError instance."
	
	| exc |
	exc := BrokenPipeError ___new___:  BrokenPipeError .
	self assert: exc notNil.
%

category: 'Python-Tests-BrokenPipeError'
method: BrokenPipeErrorTestCase
test_inheritance
	"Test that BrokenPipeError inherits from ConnectionError."
	
	| exc |
	exc := BrokenPipeError ___new___:  BrokenPipeError .
	self assert: (exc isKindOf: ConnectionError).
%
