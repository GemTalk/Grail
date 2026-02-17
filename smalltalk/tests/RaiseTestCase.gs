! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for RaiseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'RaiseTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
RaiseTestCase category: 'SUnit'
%

! ===============================================================================
! RaiseTestCase - Tests for Python raise statement
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
RaiseTestCase removeAllMethods.
RaiseTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests'
method: RaiseTestCase
testRaiseInstance
	"Test raise with an exception instance."

	self should: [self eval: 'raise ValueError("bad value")'] raise: ValueError.
%

category: 'Tests'
method: RaiseTestCase
testRaiseClass
	"Test raise with just an exception class (no args)."

	self should: [self eval: 'raise TypeError'] raise: TypeError.
%

category: 'Tests'
method: RaiseTestCase
testRaiseMessage
	"Test that the message from raise is preserved."

	| msg |
	[
		self eval: 'raise ValueError("test message")'.
	] on: ValueError do: [:ex |
		msg := ex description.
	].
	self assert: msg = 'ValueError: test message'.
%

category: 'Tests'
method: RaiseTestCase
testRaiseInFunction
	"Test raise inside a function."

	self should: [self eval: 'def fail():
    raise ValueError("oops")
fail()'] raise: ValueError.
%

category: 'Tests'
method: RaiseTestCase
testBareRaise
	"Test bare raise re-raises the current exception."

	self should: [self eval: 'try:
    raise ValueError("original")
except ValueError:
    raise'] raise: ValueError.
%
