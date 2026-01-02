! ===============================================================================
! KeyErrorTestCase - Tests for Python KeyError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KeyErrorTestCase removeAllMethods.
KeyErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-KeyError'
method: KeyErrorTestCase
test_inheritance
	"Test that KeyError inherits from LookupError."
	
	| exc |
	exc := KeyError ___new___:  KeyError .
	self assert: (exc isKindOf: LookupError).
%

category: 'Python-Tests-KeyError'
method: KeyErrorTestCase
test_creation
	"Test creating a KeyError instance."
	
	| exc |
	exc := KeyError ___new___:  KeyError .
	self assert: exc notNil.
%
