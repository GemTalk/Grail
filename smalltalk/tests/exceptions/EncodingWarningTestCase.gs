! ===============================================================================
! EncodingWarningTestCase - Tests for Python EncodingWarning
! ===============================================================================

expectvalue /Metaclass3
doit
EncodingWarningTestCase removeAllMethods: 2.
EncodingWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-EncodingWarning'
method: EncodingWarningTestCase
test_inheritance
	"Test that EncodingWarning inherits from Warning."
	
	| exc |
	exc := EncodingWarning perform: #__new__: env: 2 withArguments: { EncodingWarning }.
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-EncodingWarning'
method: EncodingWarningTestCase
test_creation
	"Test creating a EncodingWarning instance."
	
	| exc |
	exc := EncodingWarning perform: #__new__: env: 2 withArguments: { EncodingWarning }.
	self assert: exc notNil.
%
