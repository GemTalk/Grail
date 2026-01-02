! ===============================================================================
! SyntaxWarningTestCase - Tests for Python SyntaxWarning
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SyntaxWarningTestCase removeAllMethods.
SyntaxWarningTestCase class removeAllMethods.
%

category: 'Python-Tests-SyntaxWarning'
method: SyntaxWarningTestCase
test_inheritance
	"Test that SyntaxWarning inherits from Warning."
	
	| exc |
	exc := SyntaxWarning ___new___:  SyntaxWarning .
	self assert: (exc isKindOf: Warning).
%

category: 'Python-Tests-SyntaxWarning'
method: SyntaxWarningTestCase
test_creation
	"Test creating a SyntaxWarning instance."
	
	| exc |
	exc := SyntaxWarning ___new___:  SyntaxWarning .
	self assert: exc notNil.
%
