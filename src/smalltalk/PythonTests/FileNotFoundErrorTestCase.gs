! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FileNotFoundErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FileNotFoundErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FileNotFoundErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FileNotFoundErrorTestCase - Tests for Python FileNotFoundError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FileNotFoundErrorTestCase removeAllMethods.
FileNotFoundErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-FileNotFoundError'
method: FileNotFoundErrorTestCase
test_creation
	"Test creating a FileNotFoundError instance."
	
	| exc |
	exc := FileNotFoundError ___new___:  FileNotFoundError .
	self assert: exc notNil.
%

category: 'Grail-Tests-FileNotFoundError'
method: FileNotFoundErrorTestCase
test_inheritance
	"Test that FileNotFoundError inherits from OSError."
	
	| exc |
	exc := FileNotFoundError ___new___:  FileNotFoundError .
	self assert: (exc isKindOf: OSError).
%
