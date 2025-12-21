! ===============================================================================
! UnicodeDecodeErrorTestCase - Tests for Python UnicodeDecodeError
! ===============================================================================

expectvalue /Metaclass3
doit
UnicodeDecodeErrorTestCase removeAllMethods: 2.
UnicodeDecodeErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-UnicodeDecodeError'
method: UnicodeDecodeErrorTestCase
test_inheritance
	"Test that UnicodeDecodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeDecodeError perform: #__new__: env: 2 withArguments: { UnicodeDecodeError }.
	self assert: (exc isKindOf: UnicodeError).
%

category: 'Python-Tests-UnicodeDecodeError'
method: UnicodeDecodeErrorTestCase
test_creation
	"Test creating a UnicodeDecodeError instance."
	
	| exc |
	exc := UnicodeDecodeError perform: #__new__: env: 2 withArguments: { UnicodeDecodeError }.
	self assert: exc notNil.
%
