! ===============================================================================
! FutureWarningTestCase - Tests for Python FutureWarning
! ===============================================================================

expectvalue /Metaclass3
doit
FutureWarningTestCase removeAllMethods: 2.
FutureWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-FutureWarning'
method: FutureWarningTestCase
test_inheritance
	"Test that FutureWarning inherits from Warning."
	
	| exc |
	exc := FutureWarning perform: #__new__: env: 2 withArguments: { FutureWarning }.
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-FutureWarning'
method: FutureWarningTestCase
test_creation
	"Test creating a FutureWarning instance."
	
	| exc |
	exc := FutureWarning perform: #__new__: env: 2 withArguments: { FutureWarning }.
	self assert: exc notNil.
%
