! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReturnTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReturnTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ReturnTestCase category: 'SUnit'
%

! ===============================================================================
! ReturnTestCase - Tests for Python return statement
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReturnTestCase removeAllMethods.
ReturnTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests'
method: ReturnTestCase
testReturnValue
	"Test return statement in a function."

	self assert: (self eval: 'def double(x):
    return x * 2
double(5)') equals: 10.
%

category: 'Tests'
method: ReturnTestCase
testReturnNone
	"Test bare return returns None."

	self assert: (self eval: 'def f():
    return
f()') equals: None.
%

category: 'Tests'
method: ReturnTestCase
testReturnEarly
	"Test early return skips remaining statements."

	self assert: (self eval: 'def f(x):
    if x > 0:
        return x
    return -x
f(5)') equals: 5.
	self assert: (self eval: 'def f(x):
    if x > 0:
        return x
    return -x
f(-3)') equals: 3.
%

category: 'Tests'
method: ReturnTestCase
testReturnExpression
	"Test return with a computed expression."

	self assert: (self eval: 'def add(a, b):
    return a + b
add(3, 4)') equals: 7.
%
