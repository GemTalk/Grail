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
	"__init__(x) takes ONE positional; args becomes the 1-tuple (x,) --
	CPython's BaseException.args.  (Pass the raw value, not #(...): an Array
	argument would be the single element of a 1-tuple, args == (#(...),).)"
	exc @env1:__init__: 'error message'.

	args := exc @env1:args.
	self assert: args size equals: 1.
	self assert: (args at: 1) equals: 'error message'.
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_equality
	"CPython uses IDENTITY equality for exceptions.  BaseException defines no
	__eq__, so ``ValueError('x') == ValueError('x')'' is FALSE -- two
	exceptions built from the same arguments are still two objects.

	This test used to assert the opposite, pinning a Grail deviation: a
	value-based __eq__ (same class + same args) with no matching __hash__.
	That was wrong twice -- it disagreed with CPython, and it broke the
	equality/hash contract, so two exceptions could compare equal while
	hashing differently (a set held both; a dict could miss one it held)."

	| exc1 exc2 exc3 |
	exc1 := BaseException @env1:__new__: 'msg'.
	exc1 @env1:__init__: #('msg').

	exc2 := BaseException @env1:__new__: 'msg'.
	exc2 @env1:__init__: #('msg').

	exc3 := BaseException @env1:__new__: 'different'.
	exc3 @env1:__init__: #('different').

	"Same args, distinct objects -- NOT equal.  Sent through the OPERATOR
	(___cmpEq___:/___cmpNe___:, what compiled Python sends): BaseException
	defines no __eq__, and object's default now PUNTS with NotImplemented
	rather than deciding, so the reflected operand gets its turn -- the
	operator is what turns the punt into False."
	self deny: (exc1 @env1:___cmpEq___: exc2).
	self assert: (exc1 @env1:___cmpNe___: exc2).
	"Different args -- also not equal."
	self assert: (exc1 @env1:___cmpNe___: exc3).
	"Identity holds, and the hash agrees with it."
	self assert: (exc1 @env1:___cmpEq___: exc1).
	self assert: (exc1 @env1:__hash__) equals: (exc1 @env1:__hash__)
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
	exc @env1:__init__: 'test message'.
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
	exc @env1:__init__: 'test'.
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

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_reraise_caught_exception
	"``except E as e: raise e'' re-raises the exception being handled, keeping
	object identity, instead of dying with UncontinuableError 6011 ('Exception
	has already been signaled') -- GemStone refuses a second #signal, so the
	raise path uses #pass when the exception is still in flight.  Also covers
	``raise X from Y'' / ``from None'', which previously dropped the cause
	entirely.  See tests/python/reraise_caught.py."

	| mod results |
	importlib @env1:modules removeKey: #'reraise_caught' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reraise_caught.py')
		name: 'reraise_caught'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'basic_reraised' 'basic_identity' 'basic_message' 'bare_identity'
	   'from_none_identity' 'from_none_cause' 'from_none_suppress'
	   'from_cause_identity' 'from_cause_cause' 'from_cause_suppress'
	   'nested_frame_identity' 'different_exc' 'rebound'
	   'stashed_identity' 'stashed_message' 'import_shape'
	   'call_from_cause' 'call_from_suppress' 'call_from_message'
	   'class_from_cause' 'class_from_suppress'
	   'call_from_none_cause' 'call_from_none_suppress'
	   'bad_cause_typeerror' 'no_from_cause_none' 'no_from_suppress_false'
	   'loop_twice' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 're-raise check failed: ' , k].
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_exception_group_caught_as_exception
	"PEP 654: ExceptionGroup derives from BOTH BaseExceptionGroup and
	Exception, so ``except Exception:'' must catch one.  Grail's
	single-inheritance chain makes them siblings under BaseException, and only
	___issubclass___ had been widened -- so issubclass said yes while a raised
	group escaped ``except Exception:'' as an uncatchable Smalltalk error.
	Exception class>>handles: (the protocol on:do: really resolves through) and
	isinstance now widen to match.  Both narrowings are pinned: a SUBCLASS of
	Exception must not start catching groups, and a bare BaseExceptionGroup is
	still not an Exception.  See tests/python/exception_group_catch.py."

	| mod results |
	importlib @env1:modules removeKey: #'exception_group_catch' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_group_catch.py')
		name: 'exception_group_catch'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'issubclass_eg_exception' 'eg_by_exception' 'eg_by_eg' 'eg_by_beg'
	   'eg_by_baseexception' 'eg_not_by_valueerror' 'eg_not_by_typeerror'
	   'issubclass_beg_exception' 'beg_not_by_exception' 'beg_by_beg'
	   'beg_by_baseexception' 'plain_by_exception' 'plain_by_valueerror'
	   'plain_not_by_typeerror' 'keyboardinterrupt_not_by_exception'
	   'eg_subclass_by_exception' 'caught_message' 'caught_is_group'
	   'caught_is_exception' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'ExceptionGroup catch check failed: ' , k].
%

category: 'Grail-Tests-BaseException'
method: BaseExceptionTestCase
test_recursion_raises_recursion_error
	"Runaway Python recursion raises CPython's catchable RecursionError instead
	of exhausting the Smalltalk stack with an AlmostOutOfStack notification no
	Python ``except'' can contain.  BaseException class>>___recursionGuard___
	converts it with #resignalAs:, which re-signals from the ORIGINAL (deep)
	point -- so handlers BELOW the guard still match, which a freshly signalled
	exception would have skipped.  One guard at the module-execution boundary,
	no per-call cost.

	KNOWN LIMITATION, documented in the fixture: a recursion that installs a
	handler at EVERY level still dies, because passing the notification outward
	through all of them consumes the last of the stack.  See
	tests/python/recursion_limit.py."

	| mod results |
	importlib @env1:modules removeKey: #'recursion_limit' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/recursion_limit.py')
		name: 'recursion_limit'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'plain' 'plain_message' 'is_runtime_error' 'is_exception'
	   'by_runtime_error' 'by_exception' 'mutual'
	   'still_alive' 'bounded_recursion_ok' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'recursion-limit check failed: ' , k].
%
