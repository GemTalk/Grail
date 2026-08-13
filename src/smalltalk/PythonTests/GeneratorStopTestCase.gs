! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorStopTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GeneratorStopTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GeneratorStopTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GeneratorStopTestCase — PEP 479: a StopIteration raised inside a generator
! BODY becomes RuntimeError('generator raised StopIteration'), chained onto the
! StopIteration as __cause__ and __context__ with __suppress_context__ set.
!
! Grail re-signalled the escaped StopIteration verbatim, so it was
! indistinguishable from the generator's own exhaustion signal: it silently
! ended the consumer's loop instead of surfacing the bug.  Both of CPython's
! test_generator_stop tests errored on it.
!
! HALF of these tests pin what must NOT convert.  The same StopIteration
! reports normal exhaustion, ends a ``yield from'' delegation, and is what
! ``next(it, default)'' swallows -- converting any of those would break every
! generator in Grail, so each is nailed down here rather than left to the
! CPython module (which does not cover them).
!
! Fixture: tests/python/pep479_generator_stop.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorStopTestCase removeAllMethods.
GeneratorStopTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
results
	"Load tests/python/pep479_generator_stop.py fresh and answer its RESULTS."

	| mod |
	importlib @env1:modules removeKey: #'pep479_generator_stop' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pep479_generator_stop.py')
		name: 'pep479_generator_stop'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
assertResult: aKey equals: expected
	self
		assert: (self results @env1:__getitem__: aKey)
		equals: expected
%

! --- must convert ------------------------------------------------------------

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testStopIterationFromBodyBecomesRuntimeError
	"``def g(): yield f()'' where f raises StopIteration."

	self
		assertResult: 'convert_body_raises'
		equals: 'RuntimeError: generator raised StopIteration'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testWrappedErrorCarriesCauseContextAndSuppress
	"CPython requires all three: __cause__ and __context__ are the
	StopIteration, and __suppress_context__ is True — i.e. exactly what
	``raise RuntimeError(...) from ex'' produces.  Both __cause__ and
	__suppress_context__ were hardcoded stubs (None / false) before this."

	self
		assertResult: 'convert_chaining'
		equals: '(''StopIteration'', ''StopIteration'', True)'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testNextOnDrainedInnerIteratorConverts
	"The classic PEP 479 shape — ``while True: yield next(it)'' — which used to
	end the outer generator SILENTLY when it drained, yielding a short list
	instead of raising."

	self
		assertResult: 'convert_inner_next'
		equals: 'RuntimeError: generator raised StopIteration'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testConversionAlsoAppliesOnTheSendPath
	"send: and throw: had the same re-signal code duplicated; both now route
	through _signalEscapedException, so the wrapping is not next()-only."

	self
		assertResult: 'convert_via_send'
		equals: 'RuntimeError: generator raised StopIteration'
%

! --- must NOT convert --------------------------------------------------------

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testNormalExhaustionIsUnaffected
	"The generator's OWN termination signal is raised by send:/throw:
	themselves, not by the escaped-exception path — it must stay StopIteration
	or every loop over a generator breaks."

	self assertResult: 'keep_normal_exhaustion' equals: '[1, 2]'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testExplicitReturnIsUnaffected
	self assertResult: 'keep_explicit_return' equals: '[1]'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testStopIterationCaughtInBodyIsUnaffected
	"Caught inside the body — it never escapes, so there is nothing to wrap."

	self assertResult: 'keep_caught_in_body' equals: '[''caught'']'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testYieldFromDelegationIsUnaffected
	"``yield from'' consumes the inner generator's StopIteration to end the
	delegation; wrapping it would turn every delegation into a RuntimeError."

	self assertResult: 'keep_yield_from' equals: '[1, 2, 3]'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testForLoopOverGeneratorIsUnaffected
	self assertResult: 'keep_for_loop' equals: '3'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testGeneratorExpressionIsUnaffected
	self assertResult: 'keep_genexp' equals: '[0, 2, 4]'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testNextWithDefaultIsUnaffected
	"next(it, default) swallows the exhaustion StopIteration; a RuntimeError
	there would escape instead of yielding the default."

	self assertResult: 'keep_next_default' equals: '(1, ''dflt'')'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testExhaustedGeneratorKeepsRaisingStopIteration
	"Advancing a finished generator repeatedly stays StopIteration (the
	``done ifTrue:'' early return, a second untouched path)."

	self
		assertResult: 'keep_exhausted_reraise'
		equals: '''StopIteration both times'''
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testOtherExceptionsPropagateUnchanged
	"Only StopIteration is wrapped — every other exception escaping the body
	still reaches the consumer as itself (test_heapq's
	test_merge_does_not_suppress_index_error depends on this)."

	self
		assertResult: 'keep_other_exception'
		equals: 'ZeroDivisionError: division by zero'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testThrownStopIterationCaughtByBodyIsUnaffected
	"gen.throw(StopIteration()) caught by the body and answered with another
	yield — the injected-exception path, not the escaped one."

	self assertResult: 'keep_throw_caught' equals: '''swallowed'''
%

! --- an exception that was PASSED must still reach the consumer --------------
!
! The generator body runs on a forked producer process, so an exception raised
! there is stowed and re-signalled on the consumer.  The VM refuses -- with an
! UNCATCHABLE UncontinuableError 6011, 'Exception has already been signaled' --
! to signal an instance that still carries handler frames, and an exception
! that was PASSED on its way out keeps a frame's worth.  Grail passes routinely
! (a bare ``raise'' in an ``except'', and every comprehension, which pushes its
! traceback frame in a handler and re-passes), so these shapes replaced the
! user's own exception with an error no Python ``except'' could catch.
! PythonGenerator>>_resignalable: re-signals a clean copy in that case.

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testBareReraiseInBodyReachesConsumer
	"``try: raise ValueError ... except ValueError: raise'' inside a generator
	body.  RaiseAst compiles the bare re-raise to ``___ex pass''."

	self assertResult: 'passed_bare_reraise' equals: 'ValueError: boom'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testExceptionThroughComprehensionInBodyReachesConsumer
	"A comprehension in the body wraps its element expression in a handler that
	pushes the traceback frame and passes.  This is the shape that made a
	jinja2 UndefinedError surface as error 6011 during template rendering --
	``{{ people|groupby('age') }}'', whose filter sorts inside a comprehension,
	consumed by str.join over the render generator."

	self
		assertResult: 'passed_comprehension'
		equals: 'ZeroDivisionError: division by zero'
%

category: 'Grail-Tests-PEP479'
method: GeneratorStopTestCase
testThrowOfAnExceptionBeingHandledReachesBody
	"``gen.throw(exc)'' from inside ``except ... as exc'' -- the injected
	exception is mid-signal on the consumer, so throw:/___yield___: need the
	same treatment as the escaped-exception path."

	self assertResult: 'passed_throw_handled' equals: '''rethrown: thrown'''
%
