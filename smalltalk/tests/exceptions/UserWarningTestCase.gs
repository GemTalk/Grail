! ===============================================================================
! UserWarningTestCase - Tests for Python UserWarning
! ===============================================================================

expectvalue /Metaclass3
doit
UserWarningTestCase removeAllMethods: 2.
UserWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
