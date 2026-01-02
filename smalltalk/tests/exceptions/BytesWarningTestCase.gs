! ===============================================================================
! BytesWarningTestCase - Tests for Python BytesWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BytesWarningTestCase removeAllMethods.
BytesWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-BytesWarning'
method: BytesWarningTestCase
test_inheritance
	"Test that BytesWarning inherits from Warning."
	
	| exc |
	exc := BytesWarning ___new___:  BytesWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-BytesWarning'
method: BytesWarningTestCase
test_creation
	"Test creating a BytesWarning instance."
	
	| exc |
	exc := BytesWarning ___new___:  BytesWarning .
	self assert: exc notNil.
%
