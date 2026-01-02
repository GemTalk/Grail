! ===============================================================================
! DeprecationWarningTestCase - Tests for Python DeprecationWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
DeprecationWarningTestCase removeAllMethods.
DeprecationWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-DeprecationWarning'
method: DeprecationWarningTestCase
test_inheritance
	"Test that DeprecationWarning inherits from Warning."
	
	| exc |
	exc := DeprecationWarning ___new___:  DeprecationWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-DeprecationWarning'
method: DeprecationWarningTestCase
test_creation
	"Test creating a DeprecationWarning instance."
	
	| exc |
	exc := DeprecationWarning ___new___:  DeprecationWarning .
	self assert: exc notNil.
%
