! ===============================================================================
! DeprecationWarningTestCase - Tests for Python DeprecationWarning
! ===============================================================================

expectvalue /Metaclass3
doit
DeprecationWarningTestCase removeAllMethods: 2.
DeprecationWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-DeprecationWarning'
method: DeprecationWarningTestCase
test_inheritance
	"Test that DeprecationWarning inherits from Warning."
	
	| exc |
	exc := DeprecationWarning perform: #__new__: env: 2 withArguments: { DeprecationWarning }.
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-DeprecationWarning'
method: DeprecationWarningTestCase
test_creation
	"Test creating a DeprecationWarning instance."
	
	| exc |
	exc := DeprecationWarning perform: #__new__: env: 2 withArguments: { DeprecationWarning }.
	self assert: exc notNil.
%
