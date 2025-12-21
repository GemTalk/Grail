! ===============================================================================
! RuntimeWarningTestCase - Tests for Python RuntimeWarning
! ===============================================================================

expectvalue /Metaclass3
doit
RuntimeWarningTestCase removeAllMethods: 2.
RuntimeWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-RuntimeWarning'
method: RuntimeWarningTestCase
test_inheritance
	"Test that RuntimeWarning inherits from Warning."
	
	| exc |
	exc := RuntimeWarning perform: #__new__: env: 2 withArguments: { RuntimeWarning }.
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-RuntimeWarning'
method: RuntimeWarningTestCase
test_creation
	"Test creating a RuntimeWarning instance."
	
	| exc |
	exc := RuntimeWarning perform: #__new__: env: 2 withArguments: { RuntimeWarning }.
	self assert: exc notNil.
%
