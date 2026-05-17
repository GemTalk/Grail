! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleNotFoundErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleNotFoundErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ModuleNotFoundErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleNotFoundErrorTestCase - Tests for Python ModuleNotFoundError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleNotFoundErrorTestCase removeAllMethods.
ModuleNotFoundErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ModuleNotFoundError'
method: ModuleNotFoundErrorTestCase
test_creation
	"Test creating a ModuleNotFoundError instance."
	
	| exc |
	exc := ModuleNotFoundError ___new___:  ModuleNotFoundError .
	self assert: exc notNil.
%

category: 'Grail-Tests-ModuleNotFoundError'
method: ModuleNotFoundErrorTestCase
test_inheritance
	"Test that ModuleNotFoundError inherits from ImportError."
	
	| exc |
	exc := ModuleNotFoundError ___new___:  ModuleNotFoundError .
	self assert: (exc isKindOf: ImportError).
%
