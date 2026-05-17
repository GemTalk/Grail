! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SyntaxWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SyntaxWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SyntaxWarningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SyntaxWarningTestCase - Tests for Python SyntaxWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SyntaxWarningTestCase removeAllMethods.
SyntaxWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-SyntaxWarning'
method: SyntaxWarningTestCase
test_creation
	"Test creating a SyntaxWarning instance."
	
	| exc |
	exc := SyntaxWarning ___new___:  SyntaxWarning .
	self assert: exc notNil.
%

category: 'Grail-Tests-SyntaxWarning'
method: SyntaxWarningTestCase
test_inheritance
	"Test that SyntaxWarning inherits from Warning."
	
	| exc |
	exc := SyntaxWarning ___new___:  SyntaxWarning .
	self assert: (exc isKindOf: Warning).
%
