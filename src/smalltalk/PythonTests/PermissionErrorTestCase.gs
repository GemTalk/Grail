! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PermissionErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PermissionErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PermissionErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PermissionErrorTestCase - Tests for Python PermissionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PermissionErrorTestCase removeAllMethods.
PermissionErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-PermissionError'
method: PermissionErrorTestCase
test_creation
	"Test creating a PermissionError instance."
	
	| exc |
	exc := PermissionError ___new___:  PermissionError .
	self assert: exc notNil.
%

category: 'Grail-Tests-PermissionError'
method: PermissionErrorTestCase
test_inheritance
	"Test that PermissionError inherits from OSError."
	
	| exc |
	exc := PermissionError ___new___:  PermissionError .
	self assert: (exc isKindOf: OSError).
%
