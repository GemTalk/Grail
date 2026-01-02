! ===============================================================================
! FutureWarningTestCase - Tests for Python FutureWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FutureWarningTestCase removeAllMethods.
FutureWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-FutureWarning'
method: FutureWarningTestCase
test_inheritance
	"Test that FutureWarning inherits from Warning."
	
	| exc |
	exc := FutureWarning ___new___:  FutureWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-FutureWarning'
method: FutureWarningTestCase
test_creation
	"Test creating a FutureWarning instance."
	
	| exc |
	exc := FutureWarning ___new___:  FutureWarning .
	self assert: exc notNil.
%
