! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PassTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PassTestCase category: 'SUnit'
%

! ===============================================================================
! PassTestCase - Tests for Python pass statement
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PassTestCase removeAllMethods.
PassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests'
method: PassTestCase
testPass
	"Test pass as a standalone statement."

	self assert: (self eval: 'pass
42') equals: 42.
%

category: 'Tests'
method: PassTestCase
testPassInIf
	"Test pass in an if branch."

	self assert: (self eval: 'x = 5
if x > 10:
    pass
x') equals: 5.
%

category: 'Tests'
method: PassTestCase
testPassInFunction
	"Test pass as a function body placeholder."

	self assert: (self eval: 'def noop():
    pass
noop()') equals: None.
%
