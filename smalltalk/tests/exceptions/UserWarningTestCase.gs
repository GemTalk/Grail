! ===============================================================================
! UserWarningTestCase - Tests for Python UserWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UserWarningTestCase removeAllMethods.
UserWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-UserWarning'
method: UserWarningTestCase
test_inheritance
	"Test that UserWarning inherits from Warning."
	
	| exc |
	exc := UserWarning ___new___:  UserWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-UserWarning'
method: UserWarningTestCase
test_creation
	"Test creating a UserWarning instance."
	
	| exc |
	exc := UserWarning ___new___:  UserWarning .
	self assert: exc notNil.
%
