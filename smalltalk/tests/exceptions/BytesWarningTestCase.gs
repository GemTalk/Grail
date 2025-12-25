! ===============================================================================
! BytesWarningTestCase - Tests for Python BytesWarning
! ===============================================================================

expectvalue /Metaclass3
doit
BytesWarningTestCase removeAllMethods: 2.
BytesWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

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
