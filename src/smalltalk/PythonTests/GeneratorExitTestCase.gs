! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorExitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GeneratorExitTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GeneratorExitTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GeneratorExitTestCase - Tests for Python GeneratorExit
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorExitTestCase removeAllMethods.
GeneratorExitTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-GeneratorExit'
method: GeneratorExitTestCase
test_creation
	"Test creating a GeneratorExit instance."
	
	| exc |
	exc := GeneratorExit ___new___:  GeneratorExit .
	self assert: exc notNil.
%

category: 'Grail-Tests-GeneratorExit'
method: GeneratorExitTestCase
test_inheritance
	"Test that GeneratorExit inherits from BaseException."
	
	| exc |
	exc := GeneratorExit ___new___:  GeneratorExit .
	self assert: (exc isKindOf: BaseException).
%
