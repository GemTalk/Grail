! ===============================================================================
! KeyboardInterruptTestCase - Tests for Python KeyboardInterrupt
! ===============================================================================

expectvalue /Metaclass3
doit
KeyboardInterruptTestCase removeAllMethods: 2.
KeyboardInterruptTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-KeyboardInterrupt'
method: KeyboardInterruptTestCase
test_inheritance
	"Test that KeyboardInterrupt inherits from BaseException."
	
	| exc |
	exc := KeyboardInterrupt perform: #__new__: env: 2 withArguments: { KeyboardInterrupt }.
	self assert: (exc isKindOf: BaseException).
%

category: 'Python-Tests-KeyboardInterrupt'
method: KeyboardInterruptTestCase
test_creation
	"Test creating a KeyboardInterrupt instance."
	
	| exc |
	exc := KeyboardInterrupt perform: #__new__: env: 2 withArguments: { KeyboardInterrupt }.
	self assert: exc notNil.
%
