! ===============================================================================
! UnicodeEncodeErrorTestCase - Tests for Python UnicodeEncodeError
! ===============================================================================

expectvalue /Metaclass3
doit
UnicodeEncodeErrorTestCase removeAllMethods: 2.
UnicodeEncodeErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-UnicodeEncodeError'
method: UnicodeEncodeErrorTestCase
test_inheritance
	"Test that UnicodeEncodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeEncodeError perform: #__new__: env: 2 withArguments: { UnicodeEncodeError }.
	self assert: (exc isKindOf: UnicodeError).
%

category: 'Python-Tests-UnicodeEncodeError'
method: UnicodeEncodeErrorTestCase
test_creation
	"Test creating a UnicodeEncodeError instance."
	
	| exc |
	exc := UnicodeEncodeError perform: #__new__: env: 2 withArguments: { UnicodeEncodeError }.
	self assert: exc notNil.
%
