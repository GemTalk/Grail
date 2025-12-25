! ===============================================================================
! UnicodeErrorTestCase - Tests for Python UnicodeError
! ===============================================================================

expectvalue /Metaclass3
doit
UnicodeErrorTestCase removeAllMethods: 2.
UnicodeErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-UnicodeError'
method: UnicodeErrorTestCase
test_inheritance
	"Test that UnicodeError inherits from ValueError."
	
	| exc |
	exc := UnicodeError ___new___:  UnicodeError .
	self assert: (exc isKindOf: ValueError).
%

category: 'Python-Tests-UnicodeError'
method: UnicodeErrorTestCase
test_creation
	"Test creating a UnicodeError instance."
	
	| exc |
	exc := UnicodeError ___new___:  UnicodeError .
	self assert: exc notNil.
%
