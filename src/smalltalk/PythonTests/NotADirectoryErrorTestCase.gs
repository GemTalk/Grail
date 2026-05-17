! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NotADirectoryErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NotADirectoryErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
NotADirectoryErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NotADirectoryErrorTestCase - Tests for Python NotADirectoryError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NotADirectoryErrorTestCase removeAllMethods.
NotADirectoryErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-NotADirectoryError'
method: NotADirectoryErrorTestCase
test_creation
	"Test creating a NotADirectoryError instance."
	
	| exc |
	exc := NotADirectoryError ___new___:  NotADirectoryError .
	self assert: exc notNil.
%

category: 'Grail-Tests-NotADirectoryError'
method: NotADirectoryErrorTestCase
test_inheritance
	"Test that NotADirectoryError inherits from OSError."
	
	| exc |
	exc := NotADirectoryError ___new___:  NotADirectoryError .
	self assert: (exc isKindOf: OSError).
%
