! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PendingDeprecationWarningTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PendingDeprecationWarningTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PendingDeprecationWarningTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PendingDeprecationWarningTestCase - Tests for Python PendingDeprecationWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PendingDeprecationWarningTestCase removeAllMethods.
PendingDeprecationWarningTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-PendingDeprecationWarning'
method: PendingDeprecationWarningTestCase
test_creation
	"Test creating a PendingDeprecationWarning instance."
	
	| exc |
	exc := PendingDeprecationWarning ___new___:  PendingDeprecationWarning .
	self assert: exc notNil.
%

category: 'Grail-Tests-PendingDeprecationWarning'
method: PendingDeprecationWarningTestCase
test_inheritance
	"Test that PendingDeprecationWarning inherits from Warning."
	
	| exc |
	exc := PendingDeprecationWarning ___new___:  PendingDeprecationWarning .
	self assert: (exc isKindOf: Warning).
%
