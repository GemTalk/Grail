! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ChildProcessErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ChildProcessErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ChildProcessErrorTestCase category: 'SUnit'
%

! ===============================================================================
! ChildProcessErrorTestCase - Tests for Python ChildProcessError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ChildProcessErrorTestCase removeAllMethods.
ChildProcessErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-ChildProcessError'
method: ChildProcessErrorTestCase
test_creation
	"Test creating a ChildProcessError instance."
	
	| exc |
	exc := ChildProcessError ___new___:  ChildProcessError .
	self assert: exc notNil.
%

category: 'Python-Tests-ChildProcessError'
method: ChildProcessErrorTestCase
test_inheritance
	"Test that ChildProcessError inherits from OSError."
	
	| exc |
	exc := ChildProcessError ___new___:  ChildProcessError .
	self assert: (exc isKindOf: OSError).
%
