! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for KeyboardInterruptTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'KeyboardInterruptTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
KeyboardInterruptTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! KeyboardInterruptTestCase - Tests for Python KeyboardInterrupt
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KeyboardInterruptTestCase removeAllMethods.
KeyboardInterruptTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-KeyboardInterrupt'
method: KeyboardInterruptTestCase
test_creation
	"Test creating a KeyboardInterrupt instance."
	
	| exc |
	exc := KeyboardInterrupt ___new___:  KeyboardInterrupt .
	self assert: exc notNil.
%

category: 'Grail-Tests-KeyboardInterrupt'
method: KeyboardInterruptTestCase
test_inheritance
	"Test that KeyboardInterrupt inherits from BaseException."
	
	| exc |
	exc := KeyboardInterrupt ___new___:  KeyboardInterrupt .
	self assert: (exc isKindOf: BaseException).
%
