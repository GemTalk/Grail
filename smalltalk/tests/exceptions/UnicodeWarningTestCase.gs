! ===============================================================================
! UnicodeWarningTestCase - Tests for Python UnicodeWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeWarningTestCase removeAllMethods.
UnicodeWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-UnicodeWarning'
method: UnicodeWarningTestCase
test_inheritance
	"Test that UnicodeWarning inherits from Warning."
	
	| exc |
	exc := UnicodeWarning ___new___:  UnicodeWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-UnicodeWarning'
method: UnicodeWarningTestCase
test_creation
	"Test creating a UnicodeWarning instance."
	
	| exc |
	exc := UnicodeWarning ___new___:  UnicodeWarning .
	self assert: exc notNil.
%
