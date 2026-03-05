! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EOFErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EOFErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
EOFErrorTestCase category: 'SUnit'
%

! ===============================================================================
! EOFErrorTestCase - Tests for Python EOFError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EOFErrorTestCase removeAllMethods.
EOFErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-EOFError'
method: EOFErrorTestCase
test_creation
	"Test creating a EOFError instance."
	
	| exc |
	exc := EOFError ___new___:  EOFError .
	self assert: exc notNil.
%

category: 'Python-Tests-EOFError'
method: EOFErrorTestCase
test_inheritance
	"Test that EOFError inherits from Exception."
	
	| exc |
	exc := EOFError ___new___:  EOFError .
	self assert: (exc isKindOf: Exception).
%
