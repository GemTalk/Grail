! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FileExistsErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FileExistsErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FileExistsErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FileExistsErrorTestCase - Tests for Python FileExistsError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FileExistsErrorTestCase removeAllMethods.
FileExistsErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-FileExistsError'
method: FileExistsErrorTestCase
test_creation
	"Test creating a FileExistsError instance."
	
	| exc |
	exc := FileExistsError ___new___:  FileExistsError .
	self assert: exc notNil.
%

category: 'Grail-Tests-FileExistsError'
method: FileExistsErrorTestCase
test_inheritance
	"Test that FileExistsError inherits from OSError."
	
	| exc |
	exc := FileExistsError ___new___:  FileExistsError .
	self assert: (exc isKindOf: OSError).
%
