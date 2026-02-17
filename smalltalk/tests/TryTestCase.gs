! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TryTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TryTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
TryTestCase category: 'SUnit'
%

! ===============================================================================
! TryTestCase - Tests for Python try/except/else/finally statements
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TryTestCase removeAllMethods.
TryTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests'
method: TryTestCase
testTryExceptCaught
	"Test that a matching except clause catches the exception."

	self assert: (self eval: 'try:
    raise ValueError("oops")
except ValueError:
    x = 42
x') equals: 42.
%

category: 'Tests'
method: TryTestCase
testTryExceptNotRaised
	"Test try body runs normally when no exception is raised."

	self assert: (self eval: 'try:
    x = 10
except ValueError:
    x = 99
x') equals: 10.
%

category: 'Tests'
method: TryTestCase
testTryExceptAs
	"Test except with as clause binds the exception."

	self assert: (self eval: 'try:
    raise ValueError("hello")
except ValueError as e:
    x = str(e)
x') equals: 'hello'.
%

category: 'Tests'
method: TryTestCase
testTryExceptNoMatch
	"Test that an unmatched exception propagates."

	self should: [self eval: 'try:
    raise TypeError("wrong")
except ValueError:
    x = 42'] raise: TypeError.
%

category: 'Tests'
method: TryTestCase
testTryExceptBare
	"Test bare except catches any exception."

	self assert: (self eval: 'try:
    raise TypeError("anything")
except:
    x = 1
x') equals: 1.
%

category: 'Tests'
method: TryTestCase
testTryFinally
	"Test finally clause always runs."

	self assert: (self eval: 'x = 0
try:
    x = 1
finally:
    x = x + 10
x') equals: 11.
%

category: 'Tests'
method: TryTestCase
testTryFinallyWithException
	"Test finally runs even when exception is raised."

	self assert: (self eval: 'x = 0
try:
    try:
        raise ValueError("err")
    finally:
        x = 99
except ValueError:
    pass
x') equals: 99.
%

category: 'Tests'
method: TryTestCase
testTryElse
	"Test else clause runs when no exception is raised."

	self assert: (self eval: 'try:
    x = 1
except ValueError:
    x = 2
else:
    x = 3
x') equals: 3.
%

category: 'Tests'
method: TryTestCase
testTryElseSkippedOnException
	"Test else clause is skipped when exception is raised."

	self assert: (self eval: 'try:
    raise ValueError("err")
except ValueError:
    x = 2
else:
    x = 3
x') equals: 2.
%

category: 'Tests'
method: TryTestCase
testTryMultipleExcepts
	"Test multiple except clauses."

	self assert: (self eval: 'try:
    raise TypeError("t")
except ValueError:
    x = 1
except TypeError:
    x = 2
x') equals: 2.
%
