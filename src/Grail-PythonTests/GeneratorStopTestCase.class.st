Class {
	#name : 'GeneratorStopTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> assertResult: aKey equals: expected [
	self
		assert: (self results @env1:__getitem__: aKey)
		equals: expected

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> results [
	"Load tests/python/pep479_generator_stop.py fresh and answer its RESULTS."

	| mod |
	importlib @env1:modules removeKey: #'pep479_generator_stop' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pep479_generator_stop.py')
		name: 'pep479_generator_stop'.
	^ mod @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testBareReraiseInBodyReachesConsumer [
	"``try: raise ValueError ... except ValueError: raise'' inside a generator
	body.  RaiseAst compiles the bare re-raise to ``___ex pass''."

	self assertResult: 'passed_bare_reraise' equals: 'ValueError: boom'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testConversionAlsoAppliesOnTheSendPath [
	"send: and throw: had the same re-signal code duplicated; both now route
	through ___signalEscapedException___, so the wrapping is not next()-only."

	self
		assertResult: 'convert_via_send'
		equals: 'RuntimeError: generator raised StopIteration'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testExceptionThroughComprehensionInBodyReachesConsumer [
	"A comprehension in the body wraps its element expression in a handler that
	pushes the traceback frame and passes.  This is the shape that made a
	jinja2 UndefinedError surface as error 6011 during template rendering --
	``{{ people|groupby('age') }}'', whose filter sorts inside a comprehension,
	consumed by str.join over the render generator."

	self
		assertResult: 'passed_comprehension'
		equals: 'ZeroDivisionError: division by zero'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testExhaustedGeneratorKeepsRaisingStopIteration [
	"Advancing a finished generator repeatedly stays StopIteration (the
	``done ifTrue:'' early return, a second untouched path)."

	self
		assertResult: 'keep_exhausted_reraise'
		equals: '''StopIteration both times'''

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testExplicitReturnIsUnaffected [
	self assertResult: 'keep_explicit_return' equals: '[1]'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testForLoopOverGeneratorIsUnaffected [
	self assertResult: 'keep_for_loop' equals: '3'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testGeneratorExpressionIsUnaffected [
	self assertResult: 'keep_genexp' equals: '[0, 2, 4]'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testNextOnDrainedInnerIteratorConverts [
	"The classic PEP 479 shape — ``while True: yield next(it)'' — which used to
	end the outer generator SILENTLY when it drained, yielding a short list
	instead of raising."

	self
		assertResult: 'convert_inner_next'
		equals: 'RuntimeError: generator raised StopIteration'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testNextWithDefaultIsUnaffected [
	"next(it, default) swallows the exhaustion StopIteration; a RuntimeError
	there would escape instead of yielding the default."

	self assertResult: 'keep_next_default' equals: '(1, ''dflt'')'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testNormalExhaustionIsUnaffected [
	"The generator's OWN termination signal is raised by send:/throw:
	themselves, not by the escaped-exception path — it must stay StopIteration
	or every loop over a generator breaks."

	self assertResult: 'keep_normal_exhaustion' equals: '[1, 2]'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testOtherExceptionsPropagateUnchanged [
	"Only StopIteration is wrapped — every other exception escaping the body
	still reaches the consumer as itself (test_heapq's
	test_merge_does_not_suppress_index_error depends on this)."

	self
		assertResult: 'keep_other_exception'
		equals: 'ZeroDivisionError: division by zero'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testStopIterationCaughtInBodyIsUnaffected [
	"Caught inside the body — it never escapes, so there is nothing to wrap."

	self assertResult: 'keep_caught_in_body' equals: '[''caught'']'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testStopIterationFromBodyBecomesRuntimeError [
	"``def g(): yield f()'' where f raises StopIteration."

	self
		assertResult: 'convert_body_raises'
		equals: 'RuntimeError: generator raised StopIteration'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testThrownStopIterationCaughtByBodyIsUnaffected [
	"gen.throw(StopIteration()) caught by the body and answered with another
	yield — the injected-exception path, not the escaped one."

	self assertResult: 'keep_throw_caught' equals: '''swallowed'''

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testThrowOfAnExceptionBeingHandledReachesBody [
	"``gen.throw(exc)'' from inside ``except ... as exc'' -- the injected
	exception is mid-signal on the consumer, so throw:/___yield___: need the
	same treatment as the escaped-exception path."

	self assertResult: 'passed_throw_handled' equals: '''rethrown: thrown'''

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testWrappedErrorCarriesCauseContextAndSuppress [
	"CPython requires all three: __cause__ and __context__ are the
	StopIteration, and __suppress_context__ is True — i.e. exactly what
	``raise RuntimeError(...) from ex'' produces.  Both __cause__ and
	__suppress_context__ were hardcoded stubs (None / false) before this."

	self
		assertResult: 'convert_chaining'
		equals: '(''StopIteration'', ''StopIteration'', True)'

]

{ #category : 'Grail-Tests-PEP479' }
GeneratorStopTestCase >> testYieldFromDelegationIsUnaffected [
	"``yield from'' consumes the inner generator's StopIteration to end the
	delegation; wrapping it would turn every delegation into a RuntimeError."

	self assertResult: 'keep_yield_from' equals: '[1, 2, 3]'

]
