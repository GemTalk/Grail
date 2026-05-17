! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssertionErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AssertionErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
AssertionErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AssertionErrorTestCase - Tests for Python AssertionError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AssertionErrorTestCase removeAllMethods.
AssertionErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-AssertionError'
method: AssertionErrorTestCase
test_creation
	"Test creating a AssertionError instance."
	
	| exc |
	exc := AssertionError ___new___: AssertionError.
	self assert: exc notNil.
%

category: 'Grail-Tests-AssertionError'
method: AssertionErrorTestCase
test_inheritance
	"Test that AssertionError inherits from Exception."
	
	| exc |
	exc := AssertionError ___new___: AssertionError.
	self assert: (exc isKindOf: Exception).
%

category: 'Grail-Tests-AssertionError'
method: AssertionErrorTestCase
test_assert_true
	"assert with a true condition should not raise."

	self eval: 'assert True'.
%

category: 'Grail-Tests-AssertionError'
method: AssertionErrorTestCase
test_assert_false
	"assert with a false condition should raise AssertionError."

	self should: [self eval: 'assert False'] raise: AssertionError.
%

category: 'Grail-Tests-AssertionError'
method: AssertionErrorTestCase
test_assert_expression
	"assert with a truthy expression should not raise."

	self assert: (self eval: 'assert 1 + 1 == 2
"ok"') equals: 'ok'.
%

category: 'Grail-Tests-AssertionError'
method: AssertionErrorTestCase
test_assert_with_message
	"assert False with a message should raise AssertionError."

	| msg |
	[
		self eval: 'assert False, "expected error"'.
	] on: AssertionError do: [:ex |
		msg := ex description.
	].
	self assert: msg = 'AssertionError: expected error'.
%

category: 'Grail-Tests-AssertionError'
method: AssertionErrorTestCase
test_assert_variable
	"assert with a truthy variable should pass; falsy should raise."

	self assert: (self eval: 'x = 5
assert x > 0
x') equals: 5.
	self should: [self eval: 'x = -1
assert x > 0'] raise: AssertionError.
%
