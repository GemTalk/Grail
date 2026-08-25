! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CoroutineReuseTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CoroutineReuseTestCase comment:
'A coroutine is awaited once -- CPython issue 25887.

An exhausted GENERATOR keeps answering the iterator protocol: a bare
StopIteration on every further next(), the thrown exception on a throw().
A finished COROUTINE refuses reuse outright -- ``RuntimeError: cannot reuse
already awaited coroutine'' on send AND throw alike -- because quietly
re-answering StopIteration is exactly how a double-await bug turns into a
truncated result instead of an error.

One override carries it: PythonCoroutine >> ___resumeFinishedWith___:, the
hook PythonGenerator''s send:/throw: consult when a consumer resumes a body
that has already finished.  The refusal composes through await for free --
awaiting a consumed coroutine raises the same RuntimeError from inside the
delegation.  close() never reaches the hook and stays quiet, repeatedly.

A coroutine SUSPENDED mid-await is just as unavailable, with its own
wording: ``coroutine is being awaited already'' -- its frame belongs to
whoever is driving it (___isMidAwait___, consulted by ___grailAwait___:
before delegating; a RUNNING coroutine falls through and keeps ''coroutine
already executing'').

Two designed-to-fail pins fired and moved with this change:
CoroutineSuspensionTestCase''s testACoroutineCanStillBeAwaitedTwice (whose
fixture row always recorded CPython''s answer -- the one probe of fifteen
that differed under Grail, now none) and the fixture-side generator pins
here prove the override does NOT leak into generators.

See tests/python/coroutine_reuse.py (7 checks, CPython-validated first).'
%

expectvalue /Class
doit
CoroutineReuseTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CoroutineReuseTestCase removeAllMethods: 0.
CoroutineReuseTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CoroutineReuseTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'coroutine_reuse' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/coroutine_reuse.py')
		name: 'coroutine_reuse'.
%

category: 'Grail-Helpers'
method: CoroutineReuseTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CoroutineReuseTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the refusal'
method: CoroutineReuseTestCase
testAFinishedCoroutineRefusesReuse
	"send and throw alike; the first completion still delivered the value as
	StopIteration -- only REUSE is refused, and close() stays quiet."

	self assertAll: #('second_send_is_reuse_error'
		'throw_after_finish_is_reuse_error' 'close_after_finish_stays_quiet')
%

category: 'Grail-Tests - the refusal'
method: CoroutineReuseTestCase
testTheRefusalComposesThroughAwait
	"Awaiting a consumed coroutine raises from inside the delegation; a
	SUSPENDED one is refused up front with its own wording."

	self assertAll: #('awaiting_a_consumed_coroutine_is_reuse_error'
		'awaiting_a_suspended_coroutine_is_refused')
%

category: 'Grail-Tests - generators untouched'
method: CoroutineReuseTestCase
testGeneratorsKeepTheIteratorProtocol
	"The exact behaviours the coroutine override replaces, pinned on the
	generator side so the override provably does not leak."

	self assertAll: #('exhausted_generator_keeps_bare_stopiteration'
		'finished_generator_throw_raises_the_thrown')
%
