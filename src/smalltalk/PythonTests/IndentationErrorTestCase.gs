! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IndentationErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IndentationErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
IndentationErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IndentationErrorTestCase - Tests for Python IndentationError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IndentationErrorTestCase removeAllMethods.
IndentationErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-IndentationError'
method: IndentationErrorTestCase
test_creation
	"Test creating a IndentationError instance."
	
	| exc |
	exc := IndentationError ___new___:  IndentationError .
	self assert: exc notNil.
%

category: 'Grail-Tests-IndentationError'
method: IndentationErrorTestCase
test_inheritance
	"Test that IndentationError inherits from SyntaxError."
	
	| exc |
	exc := IndentationError ___new___:  IndentationError .
	self assert: (exc isKindOf: SyntaxError).
%
