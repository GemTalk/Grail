! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ExitStackProtocolTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ExitStackProtocolTestCase comment:
'ExitStack, ported from CPython instead of approximated.

Grail''s ExitStack described itself as ``bare minimum: track callbacks to
run on exit'''', and the four things it got wrong were not corners.

IT NEVER TOLD A CLEANUP WHAT HAPPENED.  __exit__ passed (None, None,
None) to every callback and wrapped each one in ``except Exception:
pass''''.  So a context manager could not SEE the exception, could not
SUPPRESS it by returning true, and an exception raised BY a cleanup
vanished -- three of the guarantees the protocol exists to provide, and
all three the silent kind: the code ran, nothing complained, and the
cleanup simply did not do its job.

callback() COULD NOT CAPTURE ARGUMENTS, on the grounds that Grail''s
call-site ``*''''-unpack was not ready.  It is, and had been for a while;
the constraint was a stale comment, which is why the port measured every
feature it needed first rather than trusting the file.

push() CALLED __enter__, which it must not: push registers an ALREADY
entered manager''s __exit__, and that is its entire difference from
enter_context.

AsyncExitStack WAS AN ALIAS for the synchronous class, so ``async with''''
on one failed with ``does not support the asynchronous context manager
protocol'''' -- 26 of test_contextlib_async''s failures.

PORTED RATHER THAN REPAIRED, because the exception plumbing is the part
that matters and it is subtle: _fix_exception_context walks the
__context__ chain to the end and re-points it, and the final re-raise is
wrapped so that a bare ``raise'''' does not replace the context just set
up (CPython issue 20317).  Reimplementing that from the outside is how
you get something that passes the easy tests.

TWO DELIBERATE DEVIATIONS from the upstream text, both forced:

  * __exit__/__aexit__ take (exc_type, exc_value, traceback) rather than
    ``*exc_details''''.  Behaviourally identical -- the protocol always
    passes exactly three -- but NOT cosmetic: a Grail method whose only
    positional parameter is ``*args'''' gets no fixed-arity forwarders, so
    it does not override a fixed-arity method of the same name inherited
    from a base.  With the upstream signature every call reached
    AbstractContextManager.__exit__ instead and the stack unwound
    nothing, silently.  Recorded in docs/Issues.md.
  * a plain list replaces collections.deque, and sys / MethodType are
    imported inside the methods, because contextlib is a DEPLOYED module
    and may not carry module-level imports.

Covers test_contextlib_async''s ExitStack and AsyncExitStack families.'
%

doit
ExitStackProtocolTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ExitStackProtocolTestCase removeAllMethods: 0.
ExitStackProtocolTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExitStackProtocolTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exitstack_protocol' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exitstack_protocol.py')
		name: 'exitstack_protocol'.
%

category: 'Grail-Helpers'
method: ExitStackProtocolTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ExitStackProtocolTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testTheStackUnwindsInReverse
	"The part that already worked, kept as the regression half: LIFO
	order, the value enter_context answers, close() outside a with, and
	pop_all handing the cleanup to someone else."

	self assertAll: #('unwinds_in_reverse' 'enter_context_returns_the_value'
		'close_unwinds_outside_with' 'pop_all_defers_the_cleanup')
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testACleanupIsToldWhatHappened
	"__exit__ used to be handed (None, None, None) whatever went wrong, so
	a manager could not even see the exception it was cleaning up after."

	self assertAll: #('exit_is_told_the_exception')
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testAManagerCanSuppressTheException
	"Returning true from __exit__ swallows it, exactly as it does under a
	plain ``with''.  The old stack ignored the return value entirely."

	self assertAll: #('a_manager_can_suppress' 'a_callback_cannot_suppress')
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testAnExceptionFromACleanupIsNotSwallowed
	"``except Exception: pass'' around every callback meant a cleanup could
	fail and nobody would ever know.  It propagates, and it CHAINS to the
	exception the body raised -- which is what _fix_exception_context is
	for, and the reason this is a port and not a rewrite."

	self assertAll: #('an_exception_from_a_cleanup_propagates'
		'a_cleanup_exception_chains_to_the_body_one')
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testCallbackCapturesItsArguments
	"Blocked by a stale comment claiming call-site ``*''-unpack was not
	ready.  Positional and keyword, and callback() still answers the
	function so it works as a decorator."

	self assertAll: #('callback_captures_arguments'
		'callback_captures_keywords' 'callback_returns_its_function')
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testPushRegistersWithoutEntering
	"push takes an ALREADY entered manager; calling __enter__ for it, as
	the old implementation did, enters the thing twice."

	self assertAll: #('push_does_not_enter' 'push_returns_its_argument')
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testAsyncExitStackIsItsOwnClassNow
	"It was an alias for the synchronous one.  Unwinding, a stack that
	mixes sync and async managers in one LIFO order, an async callback,
	suppression, and aclose() outside the block."

	self assertAll: #('async_stack_unwinds' 'async_stack_mixes_sync_and_async'
		'async_callback_runs' 'async_manager_can_suppress'
		'aclose_unwinds_outside_the_block')
%

category: 'Grail-Tests'
method: ExitStackProtocolTestCase
testEnterAsyncContextRefusesASynchronousManager
	"The error it used to BE, now the error it correctly raises."

	self assertAll: #('enter_async_context_refuses_a_sync_manager')
%
