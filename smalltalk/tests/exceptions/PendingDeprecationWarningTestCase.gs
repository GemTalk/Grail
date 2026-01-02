! ===============================================================================
! PendingDeprecationWarningTestCase - Tests for Python PendingDeprecationWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PendingDeprecationWarningTestCase removeAllMethods.
PendingDeprecationWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-PendingDeprecationWarning'
method: PendingDeprecationWarningTestCase
test_inheritance
	"Test that PendingDeprecationWarning inherits from Warning."
	
	| exc |
	exc := PendingDeprecationWarning ___new___:  PendingDeprecationWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-PendingDeprecationWarning'
method: PendingDeprecationWarningTestCase
test_creation
	"Test creating a PendingDeprecationWarning instance."
	
	| exc |
	exc := PendingDeprecationWarning ___new___:  PendingDeprecationWarning .
	self assert: exc notNil.
%
