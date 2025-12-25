! ===============================================================================
! PendingDeprecationWarningTestCase - Tests for Python PendingDeprecationWarning
! ===============================================================================

expectvalue /Metaclass3
doit
PendingDeprecationWarningTestCase removeAllMethods: 2.
PendingDeprecationWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
