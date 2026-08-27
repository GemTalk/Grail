! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'YieldFromGuardTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
YieldFromGuardTestCase comment:
'Delegation boundaries: who may ``yield from'' a coroutine, and an async
generator is neither iterable nor awaitable.

CPython keys the coroutine guard on CO_ITERABLE_COROUTINE: a PLAIN
generator delegating to a coroutine is ``cannot ''yield from'' a coroutine
object in a non-coroutine generator'' (test_func_7), while a
@types.coroutine generator may -- await is BUILT on that.  Grail reads the
mark the decorator''s wrapper stamps on each result generator, and the
allowed-delegator set in ___yieldFrom___: is exactly {coroutine, async
generator, marked generator}: an async generator''s own body awaits travel
the same path with the asyncgen as delegator, which is how the first cut
of this guard took test_asyncgen from 19 to 30 before the per-test diff
caught it.

The async-generator pair closes the family-direct fast path that bypassed
the __iter__/__await__ refusals: ``yield from <agen>'' is not-iterable for
every delegator, and ``await <agen>'' is can''t-be-awaited -- await''s own
wording, checked in ___grailAwait___: before the delegation would refuse
with iteration''s.

See tests/python/yield_from_guard.py (7 checks, CPython-validated first).'
%

expectvalue /Class
doit
YieldFromGuardTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
YieldFromGuardTestCase removeAllMethods: 0.
YieldFromGuardTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: YieldFromGuardTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'yield_from_guard' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/yield_from_guard.py')
		name: 'yield_from_guard'.
%

category: 'Grail-Helpers'
method: YieldFromGuardTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: YieldFromGuardTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: YieldFromGuardTestCase
testTheCoroutineGuard
	"Refused for a plain generator, allowed for the three legitimate
	delegators -- decorated, coroutine (await), async-generator body."

	self assertAll: #('plain_generator_may_not_yield_from_a_coroutine'
		'a_decorated_generator_may' 'an_async_generators_own_awaits_still_pass'
		'await_of_a_coroutine_still_works')
%

category: 'Grail-Tests'
method: YieldFromGuardTestCase
testTheAsyncGeneratorPair
	"Not iterable under yield-from (any delegator), not awaitable under
	await -- each context with its own CPython wording."

	self assertAll: #('await_of_an_async_generator_refuses'
		'plain_yield_from_an_async_generator_refuses'
		'decorated_yield_from_an_async_generator_refuses_too')
%
