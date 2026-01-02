! ===============================================================================
! RuntimeWarningTestCase - Tests for Python RuntimeWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RuntimeWarningTestCase removeAllMethods.
RuntimeWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-RuntimeWarning'
method: RuntimeWarningTestCase
test_inheritance
	"Test that RuntimeWarning inherits from Warning."
	
	| exc |
	exc := RuntimeWarning ___new___:  RuntimeWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-RuntimeWarning'
method: RuntimeWarningTestCase
test_creation
	"Test creating a RuntimeWarning instance."
	
	| exc |
	exc := RuntimeWarning ___new___:  RuntimeWarning .
	self assert: exc notNil.
%
