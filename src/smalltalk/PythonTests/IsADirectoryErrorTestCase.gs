! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IsADirectoryErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IsADirectoryErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
IsADirectoryErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IsADirectoryErrorTestCase - Tests for Python IsADirectoryError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IsADirectoryErrorTestCase removeAllMethods.
IsADirectoryErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-IsADirectoryError'
method: IsADirectoryErrorTestCase
test_creation
	"Test creating a IsADirectoryError instance."
	
	| exc |
	exc := IsADirectoryError ___new___:  IsADirectoryError .
	self assert: exc notNil.
%

category: 'Grail-Tests-IsADirectoryError'
method: IsADirectoryErrorTestCase
test_inheritance
	"Test that IsADirectoryError inherits from OSError."
	
	| exc |
	exc := IsADirectoryError ___new___:  IsADirectoryError .
	self assert: (exc isKindOf: OSError).
%
