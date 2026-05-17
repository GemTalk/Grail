! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ResourceWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ResourceWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ResourceWarningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ResourceWarningTestCase - Tests for Python ResourceWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ResourceWarningTestCase removeAllMethods.
ResourceWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ResourceWarning'
method: ResourceWarningTestCase
test_creation
	"Test creating a ResourceWarning instance."
	
	| exc |
	exc := ResourceWarning ___new___:  ResourceWarning .
	self assert: exc notNil.
%

category: 'Grail-Tests-ResourceWarning'
method: ResourceWarningTestCase
test_inheritance
	"Test that ResourceWarning inherits from Warning."
	
	| exc |
	exc := ResourceWarning ___new___:  ResourceWarning .
	self assert: (exc isKindOf: Warning).
%
