! ===============================================================================
! KeyboardInterruptTestCase - Tests for Python KeyboardInterrupt
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
KeyboardInterruptTestCase removeAllMethods.
KeyboardInterruptTestCase class removeAllMethods.
%

category: 'Python-Tests-KeyboardInterrupt'
method: KeyboardInterruptTestCase
test_inheritance
	"Test that KeyboardInterrupt inherits from BaseException."
	
	| exc |
	exc := KeyboardInterrupt ___new___:  KeyboardInterrupt .
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-KeyboardInterrupt'
method: KeyboardInterruptTestCase
test_creation
	"Test creating a KeyboardInterrupt instance."
	
	| exc |
	exc := KeyboardInterrupt ___new___:  KeyboardInterrupt .
	self assert: exc notNil.
%
