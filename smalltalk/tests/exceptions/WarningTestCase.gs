! ===============================================================================
! WarningTestCase - Tests for Python Warning
! ===============================================================================

expectvalue /Metaclass3
doit
WarningTestCase removeAllMethods: 2.
WarningTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-Warning'
method: WarningTestCase
test_inheritance
	"Test that Warning inherits from Exception."
	
	| exc |
	exc := Warning ___new___:  Warning .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-Warning'
method: WarningTestCase
test_creation
	"Test creating a Warning instance."
	
	| exc |
	exc := Warning ___new___:  Warning .
	self assert: exc notNil.
%
