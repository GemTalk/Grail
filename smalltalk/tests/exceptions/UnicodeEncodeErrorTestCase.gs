! ===============================================================================
! UnicodeEncodeErrorTestCase - Tests for Python UnicodeEncodeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeEncodeErrorTestCase removeAllMethods.
UnicodeEncodeErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-UnicodeEncodeError'
method: UnicodeEncodeErrorTestCase
test_inheritance
	"Test that UnicodeEncodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeEncodeError ___new___:  UnicodeEncodeError .
	self assert: (exc isKindOf: UnicodeError).
%

category: 'Python-Tests-UnicodeEncodeError'
method: UnicodeEncodeErrorTestCase
test_creation
	"Test creating a UnicodeEncodeError instance."
	
	| exc |
	exc := UnicodeEncodeError ___new___:  UnicodeEncodeError .
	self assert: exc notNil.
%
