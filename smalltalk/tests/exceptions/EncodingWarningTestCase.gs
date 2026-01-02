! ===============================================================================
! EncodingWarningTestCase - Tests for Python EncodingWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EncodingWarningTestCase removeAllMethods.
EncodingWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-EncodingWarning'
method: EncodingWarningTestCase
test_inheritance
	"Test that EncodingWarning inherits from Warning."
	
	| exc |
	exc := EncodingWarning ___new___:  EncodingWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-EncodingWarning'
method: EncodingWarningTestCase
test_creation
	"Test creating a EncodingWarning instance."
	
	| exc |
	exc := EncodingWarning ___new___:  EncodingWarning .
	self assert: exc notNil.
%
