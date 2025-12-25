! ===============================================================================
! UnicodeTranslateErrorTestCase - Tests for Python UnicodeTranslateError
! ===============================================================================

expectvalue /Metaclass3
doit
UnicodeTranslateErrorTestCase removeAllMethods: 2.
UnicodeTranslateErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-UnicodeTranslateError'
method: UnicodeTranslateErrorTestCase
test_inheritance
	"Test that UnicodeTranslateError inherits from UnicodeError."
	
	| exc |
	exc := UnicodeTranslateError ___new___:  UnicodeTranslateError .
	self assert: (exc isKindOf: UnicodeError).
%

category: 'Python-Tests-UnicodeTranslateError'
method: UnicodeTranslateErrorTestCase
test_creation
	"Test creating a UnicodeTranslateError instance."
	
	| exc |
	exc := UnicodeTranslateError ___new___:  UnicodeTranslateError .
	self assert: exc notNil.
%
