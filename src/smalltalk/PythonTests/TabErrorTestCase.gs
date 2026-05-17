! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TabErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TabErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
TabErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TabErrorTestCase - Tests for Python TabError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TabErrorTestCase removeAllMethods.
TabErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-TabError'
method: TabErrorTestCase
test_creation
	"Test creating a TabError instance."
	
	| exc |
	exc := TabError ___new___:  TabError .
	self assert: exc notNil.
%

category: 'Grail-Tests-TabError'
method: TabErrorTestCase
test_inheritance
	"Test that TabError inherits from IndentationError."
	
	| exc |
	exc := TabError ___new___:  TabError .
	self assert: (exc isKindOf: IndentationError).
%
