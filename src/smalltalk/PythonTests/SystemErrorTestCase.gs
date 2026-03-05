! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SystemErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SystemErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SystemErrorTestCase category: 'SUnit'
%

! ===============================================================================
! SystemErrorTestCase - Tests for Python SystemError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SystemErrorTestCase removeAllMethods.
SystemErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-SystemError'
method: SystemErrorTestCase
test_creation
	"Test creating a SystemError instance."
	
	| exc |
	exc := SystemError ___new___:  SystemError .
	self assert: exc notNil.
%

category: 'Python-Tests-SystemError'
method: SystemErrorTestCase
test_inheritance
	"Test that SystemError inherits from Exception."
	
	| exc |
	exc := SystemError ___new___:  SystemError .
	self assert: (exc isKindOf: Exception).
%
