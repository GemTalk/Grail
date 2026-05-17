! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ValueErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ValueErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ValueErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ValueErrorTestCase - Tests for Python ValueError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ValueErrorTestCase removeAllMethods.
ValueErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ValueError'
method: ValueErrorTestCase
test_creation
	"Test creating a ValueError instance."
	
	| exc |
	exc := ValueError ___new___:  ValueError .
	self assert: exc notNil.
%

category: 'Grail-Tests-ValueError'
method: ValueErrorTestCase
test_inheritance
	"Test that ValueError inherits from Exception."
	
	| exc |
	exc := ValueError ___new___:  ValueError .
	self assert: (exc isKindOf: Exception).
%
