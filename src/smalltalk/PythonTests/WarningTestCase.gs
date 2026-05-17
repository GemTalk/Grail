! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for WarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'WarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
WarningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! WarningTestCase - Tests for Python Warning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
WarningTestCase removeAllMethods.
WarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Warning'
method: WarningTestCase
test_creation
	"Test creating a Warning instance."
	
	| exc |
	exc := Warning ___new___:  Warning .
	self assert: exc notNil.
%

category: 'Grail-Tests-Warning'
method: WarningTestCase
test_inheritance
	"Test that Warning inherits from Exception."
	
	| exc |
	exc := Warning ___new___:  Warning .
	self assert: (exc isKindOf: Exception).
%
