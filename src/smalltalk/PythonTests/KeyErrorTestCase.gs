! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for KeyErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'KeyErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
KeyErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! KeyErrorTestCase - Tests for Python KeyError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KeyErrorTestCase removeAllMethods.
KeyErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-KeyError'
method: KeyErrorTestCase
test_creation
	"Test creating a KeyError instance."
	
	| exc |
	exc := KeyError ___new___:  KeyError .
	self assert: exc notNil.
%

category: 'Grail-Tests-KeyError'
method: KeyErrorTestCase
test_inheritance
	"Test that KeyError inherits from LookupError."
	
	| exc |
	exc := KeyError ___new___:  KeyError .
	self assert: (exc isKindOf: LookupError).
%
