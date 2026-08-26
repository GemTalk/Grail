! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CoroutineNotIterableTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CoroutineNotIterableTestCase comment:
'A coroutine is not iterable; an async generator is not sync-iterable.

CPython refuses at the protocol boundary, BEFORE running any of the body:
iter / for / list / tuple / sum / a comprehension raise ``TypeError:
''coroutine'' object is not iterable'', next() says ``not an iterator'',
and the async-generator twins say ''async_generator''.  Grail inherited the
generator''s ``__iter__ -> self'' in both subclasses, so list(coro) DROVE
the coroutine (test_func_4''s body raised StopIteration mid-drive and
surfaced as PEP 479''s RuntimeError) and ``for v in agen()'' bound internal
PyAsyncYield carriers as items -- the danger isgenerator''s docstring had
already named.

The refusal lives ONLY at the Python protocol boundary.  Three moves keep
the delegation underneath it open:

  * PythonGenerator >> do: drives ``send: None'' instead of __next__.
  * ___yieldFrom___: takes a generator-family operand DIRECTLY (CPython''s
    GET_AWAITABLE never calls iter() on a coroutine; iter(gen) is gen) and
    advances it through ___subIterAdvance___:, which sends send: to the
    family and __next__ to everything else.
  * ``coro.__await__()'' now answers a PyCoroutineWrapper -- CPython''s
    _PyCoroWrapper_Type, type name ''coroutine_wrapper'' -- the ITERATOR
    the coroutine itself refuses to be.  This also repaired an
    invisible-to-the-gate swap from PR #670: the __await__-result check
    rejects a coroutine RESULT by name, and __await__ answering self was
    exactly that (test_await_14, test_await_3, test_func_18 -- the module
    gate saw 25 bad before and after, with different members).

See tests/python/coroutine_not_iterable.py (19 checks, CPython-validated
first).'
%

expectvalue /Class
doit
CoroutineNotIterableTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CoroutineNotIterableTestCase removeAllMethods: 0.
CoroutineNotIterableTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CoroutineNotIterableTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'coroutine_not_iterable' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/coroutine_not_iterable.py')
		name: 'coroutine_not_iterable'.
%

category: 'Grail-Helpers'
method: CoroutineNotIterableTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CoroutineNotIterableTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the refusals'
method: CoroutineNotIterableTestCase
testEveryConsumerRefusesACoroutine
	"iter, list, tuple, sum, for, a comprehension -- one message; next has
	its own.  And the body never ran: the refusal is at the boundary, not
	mid-drive."

	self assertAll: #('iter_refuses' 'list_refuses' 'tuple_refuses'
		'sum_refuses' 'for_refuses' 'comprehension_refuses' 'next_refuses'
		'the_body_never_ran')
%

category: 'Grail-Tests - the refusals'
method: CoroutineNotIterableTestCase
testTheAsyncGeneratorTwinsRefuse
	self assertAll: #('agen_iter_refuses' 'agen_list_refuses'
		'agen_next_refuses' 'the_agen_body_never_ran_either')
%

category: 'Grail-Tests - delegation stays open'
method: CoroutineNotIterableTestCase
testDelegationRunsUnderneathTheRefusal
	"await, the @types.coroutine yield-from pattern, async for, and plain
	generator iteration -- the paths the refusal must not sever."

	self assertAll: #('await_still_delegates'
		'decorated_yield_from_still_delegates' 'async_for_still_works'
		'plain_generators_still_iterate')
%

category: 'Grail-Tests - the wrapper'
method: CoroutineNotIterableTestCase
testAwaitDunderAnswersTheWrapper
	"coroutine_wrapper by name and in the repr; its own iterator; delivery
	and the reuse refusal both forwarded from the coroutine; and a custom
	__await__ may hand it over (test_await_14's shape)."

	self assertAll: #('await_dunder_answers_a_coroutine_wrapper'
		'wrapper_delivers_then_refuses_reuse'
		'custom_await_may_return_the_wrapper')
%
