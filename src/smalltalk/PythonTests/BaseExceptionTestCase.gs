! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BaseExceptionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BaseExceptionTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BaseExceptionTestCase category: 'SUnit'
%

! ===============================================================================
! BaseExceptionTestCase - Tests for Python BaseException
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BaseExceptionTestCase removeAllMethods.
BaseExceptionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_creation_no_args
	"Test creating a BaseException with no arguments."

	| exc args |
	exc := BaseException ___new___: BaseException.
	self assert: exc notNil.

	args := exc perform: #args env: 1.
	self assert: args isEmpty.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_creation_with_args
	"Test creating a BaseException with arguments."

	| exc args |
	exc := BaseException ___new___:  BaseException _: #('error message') .
	exc perform: #__init__: env: 1 withArguments: { #('error message') }.

	args := exc perform: #args env: 1.
	self assert: args size equals: 1.
	self assert: (args at: 1) equals: 'error message'.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_equality
	"Test exception equality comparison."

	| exc1 exc2 exc3 |
	exc1 := BaseException ___new___:  BaseException _: #('msg') .
	exc1 perform: #__init__: env: 1 withArguments: { #('msg') }.

	exc2 := BaseException ___new___:  BaseException _: #('msg') .
	exc2 perform: #__init__: env: 1 withArguments: { #('msg') }.

	exc3 := BaseException ___new___:  BaseException _: #('different') .
	exc3 perform: #__init__: env: 1 withArguments: { #('different') }.

	self assert: (exc1 perform: #__eq__: env: 1 withArguments: { exc2 }).
	self assert: (exc1 perform: #__ne__: env: 1 withArguments: { exc3 }).
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_inheritance
	"Test that BaseException inherits from GemStone's Exception."

	| exc |
	exc := BaseException ___new___: BaseException.
	self assert: (exc isKindOf: (Globals at: #Exception)).
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_repr
	"Test __repr__ method."

	| exc repr |
	exc := BaseException ___new___:  BaseException _: #('test message') .
	exc perform: #__init__: env: 1 withArguments: { #('test message') }.
	repr := exc perform: #__repr__ env: 1.

	self assert: (repr includesString: 'BaseException').
	self assert: (repr includesString: 'test message').
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_str_empty
	"Test __str__ with no arguments."

	| exc str |
	exc := BaseException ___new___: BaseException.
	str := exc perform: #__str__ env: 1.
	self assert: str isEmpty.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_str_multiple_args
	"Test __str__ with multiple arguments."

	| exc str |
	exc := BaseException ___new___:  BaseException _: #('arg1' 'arg2') .
	exc perform: #__init__: env: 1 withArguments: { #('arg1' 'arg2') }.
	str := exc perform: #__str__ env: 1.
	self assert: str notEmpty.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_str_single_arg
	"Test __str__ with single argument."

	| exc str |
	exc := BaseException ___new___:  BaseException _: #('test') .
	exc perform: #__init__: env: 1 withArguments: { #('test') }.
	str := exc perform: #__str__ env: 1.
	self assert: str equals: 'test'.
%
