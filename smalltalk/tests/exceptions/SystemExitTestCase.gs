! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SystemExitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SystemExitTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SystemExitTestCase category: 'SUnit'
%

! ===============================================================================
! SystemExitTestCase - Tests for Python SystemExit
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SystemExitTestCase removeAllMethods.
SystemExitTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-SystemExit'
method: SystemExitTestCase
test_creation
	"Test creating a SystemExit instance."
	
	| exc |
	exc := SystemExit ___new___:  SystemExit .
	self assert: exc notNil.
%

category: 'Python-Tests-SystemExit'
method: SystemExitTestCase
test_inheritance
	"Test that SystemExit inherits from BaseException."
	
	| exc |
	exc := SystemExit ___new___:  SystemExit .
	self assert: (exc isKindOf: BaseException).
%
