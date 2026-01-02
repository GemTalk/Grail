! ===============================================================================
! ImportWarningTestCase - Tests for Python ImportWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ImportWarningTestCase removeAllMethods.
ImportWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-ImportWarning'
method: ImportWarningTestCase
test_inheritance
	"Test that ImportWarning inherits from Warning."
	
	| exc |
	exc := ImportWarning ___new___:  ImportWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-ImportWarning'
method: ImportWarningTestCase
test_creation
	"Test creating a ImportWarning instance."
	
	| exc |
	exc := ImportWarning ___new___:  ImportWarning .
	self assert: exc notNil.
%
