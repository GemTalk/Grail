! ===============================================================================
! SyntaxWarningTestCase - Tests for Python SyntaxWarning
! ===============================================================================

expectvalue /Metaclass3
doit
SyntaxWarningTestCase removeAllMethods: 2.
SyntaxWarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-SyntaxWarning'
method: SyntaxWarningTestCase
test_inheritance
	"Test that SyntaxWarning inherits from Warning."
	
	| exc |
	exc := SyntaxWarning perform: #__new__: env: 2 withArguments: { SyntaxWarning }.
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-SyntaxWarning'
method: SyntaxWarningTestCase
test_creation
	"Test creating a SyntaxWarning instance."
	
	| exc |
	exc := SyntaxWarning perform: #__new__: env: 2 withArguments: { SyntaxWarning }.
	self assert: exc notNil.
%
