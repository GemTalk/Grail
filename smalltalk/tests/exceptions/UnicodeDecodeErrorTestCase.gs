! ===============================================================================
! UnicodeDecodeErrorTestCase - Tests for Python UnicodeDecodeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeDecodeErrorTestCase removeAllMethods.
UnicodeDecodeErrorTestCase class removeAllMethods.
%

category: 'Python-Tests-UnicodeDecodeError'
method: UnicodeDecodeErrorTestCase
test_inheritance
	"Test that UnicodeDecodeError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeDecodeError ___new___:  UnicodeDecodeError .
	self assert: (exc isKindOf: UnicodeError).
%

category: 'Python-Tests-UnicodeDecodeError'
method: UnicodeDecodeErrorTestCase
test_creation
	"Test creating a UnicodeDecodeError instance."
	
	| exc |
	exc := UnicodeDecodeError ___new___:  UnicodeDecodeError .
	self assert: exc notNil.
%
