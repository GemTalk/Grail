! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SyntaxErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SyntaxErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SyntaxErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SyntaxErrorTestCase - Tests for Python SyntaxError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SyntaxErrorTestCase removeAllMethods.
SyntaxErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-SyntaxError'
method: SyntaxErrorTestCase
test_creation
	"Test creating a SyntaxError instance."
	
	| exc |
	exc := SyntaxError ___new___:  SyntaxError .
	self assert: exc notNil.
%

category: 'Grail-Tests-SyntaxError'
method: SyntaxErrorTestCase
test_inheritance
	"Test that SyntaxError inherits from Exception."
	
	| exc |
	exc := SyntaxError ___new___:  SyntaxError .
	self assert: (exc isKindOf: Exception).
%
