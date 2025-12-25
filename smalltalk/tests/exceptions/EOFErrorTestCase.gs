! ===============================================================================
! EOFErrorTestCase - Tests for Python EOFError
! ===============================================================================

expectvalue /Metaclass3
doit
EOFErrorTestCase removeAllMethods: 2.
EOFErrorTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-EOFError'
method: EOFErrorTestCase
test_inheritance
	"Test that EOFError inherits from Exception."
	
	| exc |
	exc := EOFError ___new___:  EOFError .
	self assert: (exc isKindOf: Exception).
%

category: 'Python-Tests-EOFError'
method: EOFErrorTestCase
test_creation
	"Test creating a EOFError instance."
	
	| exc |
	exc := EOFError ___new___:  EOFError .
	self assert: exc notNil.
%
