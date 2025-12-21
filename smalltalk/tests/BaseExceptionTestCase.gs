! ===============================================================================
! BaseExceptionTestCase - Tests for Python BaseException
! ===============================================================================

expectvalue /Metaclass3
doit
BaseExceptionTestCase removeAllMethods: 2.
BaseExceptionTestCase class removeAllMethods: 2.
%

set compile_env: 0

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_inheritance
	"Test that BaseException inherits from GemStone's Exception."

	| exc |
	exc := BaseException perform: #__new__: env: 2 withArguments: { BaseException }.
	self assert: (exc isKindOf: (Globals at: #Exception)).
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_creation_no_args
	"Test creating a BaseException with no arguments."

	| exc args |
	exc := BaseException perform: #__new__: env: 2 withArguments: { BaseException }.
	self assert: exc notNil.

	args := exc perform: #args env: 2.
	self assert: args isEmpty.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_creation_with_args
	"Test creating a BaseException with arguments."

	| exc args |
	exc := BaseException perform: #__new__:_: env: 2 withArguments: { BaseException. #('error message') }.
	exc perform: #__init__: env: 2 withArguments: { #('error message') }.

	args := exc perform: #args env: 2.
	self assert: args size equals: 1.
	self assert: (args at: 1) equals: 'error message'.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_str_empty
	"Test __str__ with no arguments."

	| exc str |
	exc := BaseException perform: #__new__: env: 2 withArguments: { BaseException }.
	str := exc perform: #__str__ env: 2.
	self assert: str isEmpty.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_str_single_arg
	"Test __str__ with single argument."

	| exc str |
	exc := BaseException perform: #__new__:_: env: 2 withArguments: { BaseException. #('test') }.
	exc perform: #__init__: env: 2 withArguments: { #('test') }.
	str := exc perform: #__str__ env: 2.
	self assert: str equals: 'test'.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_str_multiple_args
	"Test __str__ with multiple arguments."

	| exc str |
	exc := BaseException perform: #__new__:_: env: 2 withArguments: { BaseException. #('arg1' 'arg2') }.
	exc perform: #__init__: env: 2 withArguments: { #('arg1' 'arg2') }.
	str := exc perform: #__str__ env: 2.
	self assert: str notEmpty.
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_repr
	"Test __repr__ method."

	| exc repr |
	exc := BaseException perform: #__new__:_: env: 2 withArguments: { BaseException. #('test message') }.
	exc perform: #__init__: env: 2 withArguments: { #('test message') }.
	repr := exc perform: #__repr__ env: 2.

	self assert: (repr includesString: 'BaseException').
	self assert: (repr includesString: 'test message').
%

category: 'Python-Tests-BaseException'
method: BaseExceptionTestCase
test_equality
	"Test exception equality comparison."

	| exc1 exc2 exc3 |
	exc1 := BaseException perform: #__new__:_: env: 2 withArguments: { BaseException. #('msg') }.
	exc1 perform: #__init__: env: 2 withArguments: { #('msg') }.

	exc2 := BaseException perform: #__new__:_: env: 2 withArguments: { BaseException. #('msg') }.
	exc2 perform: #__init__: env: 2 withArguments: { #('msg') }.

	exc3 := BaseException perform: #__new__:_: env: 2 withArguments: { BaseException. #('different') }.
	exc3 perform: #__init__: env: 2 withArguments: { #('different') }.

	self assert: (exc1 perform: #__eq__: env: 2 withArguments: { exc2 }).
	self assert: (exc1 perform: #__ne__: env: 2 withArguments: { exc3 }).
%

