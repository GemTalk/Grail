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
BaseExceptionTestCase category: 'Grail-SUnit'
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

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_creation_no_args
	"Test creating a BaseException with no arguments."

	| exc args |
	exc := BaseException @env1:__new__.
	self assert: exc notNil.

	args := exc @env1:args.
	self assert: args isEmpty.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_creation_with_args
	"Test creating a BaseException with arguments."

	| exc args |
	exc := BaseException @env1:__new__: 'error message'.
	exc @env1:__init__: #('error message').

	args := exc @env1:args.
	self assert: args size equals: 1.
	self assert: (args at: 1) equals: 'error message'.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_equality
	"Test exception equality comparison."

	| exc1 exc2 exc3 |
	exc1 := BaseException @env1:__new__: 'msg'.
	exc1 @env1:__init__: #('msg').

	exc2 := BaseException @env1:__new__: 'msg'.
	exc2 @env1:__init__: #('msg').

	exc3 := BaseException @env1:__new__: 'different'.
	exc3 @env1:__init__: #('different').

	self assert: (exc1 @env1:__eq__: exc2).
	self assert: (exc1 @env1:__ne__: exc3).
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_inheritance
	"Test that BaseException inherits from GemStone's Exception."

	| exc |
	exc := BaseException @env1:__new__.
	self assert: (exc isKindOf: (Globals at: #Exception)).
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_repr
	"Test __repr__ method."

	| exc repr |
	exc := BaseException @env1:__new__: 'test message'.
	exc @env1:__init__: #('test message').
	repr := exc @env1:__repr__.

	self assert: (repr includesString: 'BaseException').
	self assert: (repr includesString: 'test message').
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_str_empty
	"Test __str__ with no arguments."

	| exc str |
	exc := BaseException @env1:__new__.
	str := exc @env1:__str__.
	self assert: str isEmpty.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_str_multiple_args
	"Test __str__ with multiple arguments."

	| exc str |
	exc := BaseException @env1:__new__: 'arg1' _: 'arg2'.
	exc @env1:__init__: #('arg1' 'arg2').
	str := exc @env1:__str__.
	self assert: str notEmpty.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_str_single_arg
	"Test __str__ with single argument."

	| exc str |
	exc := BaseException @env1:__new__: 'test'.
	exc @env1:__init__: #('test').
	str := exc @env1:__str__.
	self assert: str equals: 'test'.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_cause_defaults_to_none
	"Unset __cause__ surfaces as the Python None singleton, not Smalltalk nil."

	| exc |
	exc := BaseException @env1:__new__.
	self assert: exc @env1:__cause__ equals: None.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_context_defaults_to_none
	"Unset __context__ surfaces as the Python None singleton."

	| exc |
	exc := BaseException @env1:__new__.
	self assert: exc @env1:__context__ equals: None.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_init_returns_none
	"__init__ returns None (not the receiver instance), per Python protocol."

	| exc result |
	exc := BaseException @env1:__new__.
	result := exc @env1:__init__.
	self assert: result equals: None.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_init_with_args_returns_none
	"__init__: a returns None — not self — so user code that captures the
	return value (e.g. in a chained call) sees the Python value."

	| exc result |
	exc := BaseException @env1:__new__.
	result := exc @env1:__init__: #('x').
	self assert: result equals: None.
%
