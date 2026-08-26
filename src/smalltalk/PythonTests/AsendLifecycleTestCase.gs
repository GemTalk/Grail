! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AsendLifecycleTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AsendLifecycleTestCase comment:
'The asend/athrow/aclose step objects live once and own the generator.

Issue 25887''s asyncgen half.  A PyAsyncGenASend is one-shot: delivered,
closed, or refused, its next send/throw is CPython''s reuse error, spelled
per entry point (``cannot reuse already awaited __anext__()/asend()'' /
``aclose()/athrow()'').  And from first drive to step completion one step
object OWNS the generator (PythonAsyncGenerator''s asendOwner slot --
CPython''s ag_running_async): a different one driven inside that window is
refused by its own kind (``anext(): asynchronous generator is already
running'' / athrow / aclose) and comes out CLOSED.  Suspension does NOT
release the claim; that window is exactly what the guard exists for.

close() on a mid-flight step throws GeneratorExit at the suspension: a body
that catches it and suspends again has ignored it (``coroutine ignored
GeneratorExit'' -- the COROUTINE spelling, the close being on the step
object), one that lets it out closes cleanly.

The rewrite also routed athrow''s result through the same outcome
classifier as send -- before it, a body that caught the thrown exception
and yielded handed the consumer a raw PyAsyncYield tag -- and taught the
anext(ait, default) awaitable full GET_AWAITABLE validation of the
__anext__ result, where an __await__ answering 42 was an uncatchable
MessageNotUnderstood.

See tests/python/asend_lifecycle.py (10 checks, CPython-validated first).'
%

expectvalue /Class
doit
AsendLifecycleTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AsendLifecycleTestCase removeAllMethods: 0.
AsendLifecycleTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AsendLifecycleTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'asend_lifecycle' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/asend_lifecycle.py')
		name: 'asend_lifecycle'.
%

category: 'Grail-Helpers'
method: AsendLifecycleTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AsendLifecycleTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - reuse'
method: AsendLifecycleTestCase
testAStepObjectLivesOnce
	self assertAll: #('a_delivered_asend_refuses_reuse'
		'a_delivered_aclose_refuses_reuse' 'send_after_close_is_the_reuse_error')
%

category: 'Grail-Tests - ownership'
method: AsendLifecycleTestCase
testOneStepOwnsTheGenerator
	"All three kinds refused by their own spelling while another step is
	mid-flight, and the refused object comes out closed."

	self assertAll: #('a_second_asend_is_refused_by_kind_and_closed'
		'a_second_athrow_is_refused_by_kind_and_closed'
		'a_second_aclose_is_refused_by_kind_and_closed')
%

category: 'Grail-Tests - close and validation'
method: AsendLifecycleTestCase
testCloseMidFlightAndAnextValidation
	self assertAll: #('a_body_that_absorbs_the_exit_ignored_it'
		'a_body_that_lets_the_exit_out_closes_cleanly'
		'anext_validates_a_bad_await_result'
		'anext_rejects_an_inert_anext_result')
%

category: 'Grail-Tests - edges II'
method: AsendLifecycleTestCase
testLegacyArityAndGuards
	"The second round: athrow's deprecated (type, exc, tb) signature warns
	with CPython's text, a non-None send into a just-started asend refuses,
	throw() accepts an exception CLASS, and GeneratorExit thrown into a
	fresh aclose performs the close."

	self assertAll: #('athrow_legacy_signature_warns'
		'non_none_into_a_just_started_asend'
		'throw_accepts_an_exception_class'
		'throwing_generatorexit_into_a_fresh_aclose_closes')
%

category: 'Grail-Tests - edges II'
method: AsendLifecycleTestCase
testAnextEagernessAndValidation
	"anext() calls __anext__ EAGERLY -- through the ATTRIBUTE path, because
	a bare selector send bypasses a decorated method's class-dict wrapper
	(the DecoratedMethodSelfCall family) -- so a synchronously-raising
	__anext__ raises at the call, one-arg anext validates its result, a
	@types.coroutine-decorated result is accepted via the result mark, and
	inspect.isawaitable answers CPython's truth table."

	self assertAll: #('a_synchronously_raising_anext_raises_at_the_call'
		'one_arg_anext_rejects_a_bare_generator_result'
		'a_decorated_anext_result_is_accepted'
		'isawaitable_truth_table')
%

category: 'Grail-Tests - edges II'
method: AsendLifecycleTestCase
testGenexpAitersEagerly
	"PEP 530: an async genexp calls __aiter__ on its outermost iterable at
	CREATION -- ``(x async for x in None)'' raises from the enclosing
	statement even when the genexp is never consumed."

	self assertAll: #('async_genexp_aiters_its_source_at_creation')
%
