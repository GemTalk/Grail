! ===============================================================================
! ResourceWarningTestCase - Tests for Python ResourceWarning
! ===============================================================================

expectvalue /Metaclass3
doit
ResourceWarningTestCase removeAllMethods: 2.
ResourceWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-ResourceWarning'
method: ResourceWarningTestCase
test_inheritance
	"Test that ResourceWarning inherits from Warning."
	
	| exc |
	exc := ResourceWarning perform: #__new__: env: 2 withArguments: { ResourceWarning }.
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-ResourceWarning'
method: ResourceWarningTestCase
test_creation
	"Test creating a ResourceWarning instance."
	
	| exc |
	exc := ResourceWarning perform: #__new__: env: 2 withArguments: { ResourceWarning }.
	self assert: exc notNil.
%
