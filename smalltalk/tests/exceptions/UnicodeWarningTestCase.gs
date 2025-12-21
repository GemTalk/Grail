! ===============================================================================
! UnicodeWarningTestCase - Tests for Python UnicodeWarning
! ===============================================================================

expectvalue /Metaclass3
doit
UnicodeWarningTestCase removeAllMethods: 2.
UnicodeWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-UnicodeWarning'
method: UnicodeWarningTestCase
test_inheritance
	"Test that UnicodeWarning inherits from Warning."
	
	| exc |
	exc := UnicodeWarning perform: #__new__: env: 2 withArguments: { UnicodeWarning }.
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-UnicodeWarning'
method: UnicodeWarningTestCase
test_creation
	"Test creating a UnicodeWarning instance."
	
	| exc |
	exc := UnicodeWarning perform: #__new__: env: 2 withArguments: { UnicodeWarning }.
	self assert: exc notNil.
%
