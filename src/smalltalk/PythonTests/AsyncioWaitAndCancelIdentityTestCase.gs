! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsyncioWaitAndCancelIdentityTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AsyncioWaitAndCancelIdentityTestCase comment:
'asyncio.wait, and the identity of a re-raised CancelledError.

asyncio.wait was absent from Grail''s hand-written asyncio (Barrier''s
test_filling_task_by_task awaits it); the implementation is CPython''s
waiter-future shape with the 3.14-probed validation order and wording.

The identity half lives in BaseException, not asyncio: a CancelledError
suppressed by a with-statement handler (assertRaises) and later re-raised
went through ___signalOrPass___''s last-resort COPY -- stale handler
frames make plain #signal refuse (6011) and #pass finds no live frame --
so the awaiting caller got an equal-but-different instance where
test_locks'' test_cancelled_error_wakeup / _re_aquire assert ``is''.  The
fallback is now a CARRIER, the mechanism the in-flight re-raise and the
generator throw path already use, and identity is preserved on every
re-raise path.

See tests/python/asyncio_wait_and_cancel_identity.py (10 checks,
CPython-validated first).'
%

expectvalue /Class
doit
AsyncioWaitAndCancelIdentityTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AsyncioWaitAndCancelIdentityTestCase removeAllMethods: 0.
AsyncioWaitAndCancelIdentityTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsyncioWaitAndCancelIdentityTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'asyncio_wait_and_cancel_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/asyncio_wait_and_cancel_identity.py')
		name: 'asyncio_wait_and_cancel_identity'.
%

category: 'Grail-Helpers'
method: AsyncioWaitAndCancelIdentityTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AsyncioWaitAndCancelIdentityTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: AsyncioWaitAndCancelIdentityTestCase
testWaitValidationAndWording
	"Bare future, coroutine list, empty set, bad return_when -- CPython's
	order and words, plus the constants callers compare against."

	self assertAll: #('wait_refuses_bare_future' 'wait_refuses_coroutines'
		'wait_refuses_empty' 'wait_checks_return_when_first'
		'constants_are_the_strings')
%

category: 'Grail-Tests'
method: AsyncioWaitAndCancelIdentityTestCase
testWaitCompletion
	"The three return_when shapes: timeout splits done from pending,
	FIRST_COMPLETED resolves on one, the default drains all."

	self assertAll: #('wait_timeout_splits' 'wait_first_completed'
		'wait_all_completed')
%

category: 'Grail-Tests'
method: AsyncioWaitAndCancelIdentityTestCase
testCancelIdentity
	"The instance the coroutine re-raised is the instance the awaiter
	catches, message intact -- the carrier path, asserted with ``is''."

	self assertAll: #('cancel_message_carried' 'cancel_instance_identity')
%
