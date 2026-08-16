! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for YieldFromTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'YieldFromTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
YieldFromTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! YieldFromTestCase
!
! ``yield from <iter>'' delegates iteration to the inner iterable.
! Grail's YieldFromAst emits ``<iter> @env0:do: [:each | ___gen___
! ___yield___: each]'', so the receiver needs a ``do:'' method.
! Smalltalk collections have one; PythonGenerator did NOT, so
! ``yield from <generator>'' MNU'd on the first yielded value.
!
! Was the second bug surfaced once the duplicate-class fix
! (commit a9e96e5) let Node.iter_child_nodes actually return
! children — jinja2's Node.find_all uses ``yield from
! child.find_all(node_type)'' for tree traversal.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
YieldFromTestCase removeAllMethods.
YieldFromTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: YieldFromTestCase
setUp
	"Reload tests/python/yield_from.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'yield_from' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/yield_from.py')
		name: 'yield_from'.
%

category: 'Grail-Tests - yield from generator'
method: YieldFromTestCase
testYieldFromGeneratorForwardsItems
	"``yield from _producer()'' forwards each of producer's yielded
	items to the outer generator, then continues with the outer body."

	| result |
	result := testModule @env1:yield_from_generator.
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 1.
	self assert: (result at: 2) equals: 2.
	self assert: (result at: 3) equals: 3.
	self assert: (result at: 4) equals: 99
%

category: 'Grail-Tests - yield from sequence'
method: YieldFromTestCase
testYieldFromListForwardsItems
	"``yield from [10, 20, 30]'' forwards a regular sequence."

	| result |
	result := testModule @env1:yield_from_list.
	self assert: result size equals: 3.
	self assert: (result at: 1) equals: 10.
	self assert: (result at: 2) equals: 20.
	self assert: (result at: 3) equals: 30
%

category: 'Grail-Tests - empty inner'
method: YieldFromTestCase
testYieldFromEmptyGenerator
	"``yield from <empty generator>'' yields nothing, then the outer
	body continues normally."

	| result |
	result := testModule @env1:yield_from_empty_generator.
	self assert: result size equals: 1.
	self assert: (result at: 1) equals: 'done'
%

category: 'Grail-Tests - nested chain'
method: YieldFromTestCase
testYieldFromNestedChain
	"Three-level ``yield from'' chain: outer → middle → inner.
	Order preserved across all three frames."

	| result |
	result := testModule @env1:yield_from_nested.
	self assert: result size equals: 4.
	self assert: (result at: 1) equals: 'a'.
	self assert: (result at: 2) equals: 'b'.
	self assert: (result at: 3) equals: 'c'.
	self assert: (result at: 4) equals: 'd'
%

category: 'Grail-Tests - delegation return value'
method: YieldFromTestCase
testYieldFromEvaluatesToSubgeneratorReturnValue
	"``r = yield from g()'' binds what g RETURNED.  The open-coded
	``for x in it: yield x'' this replaced always evaluated to None,
	because a per-item loop has nowhere to keep the StopIteration
	value that ends the delegation."

	self assert: testModule @env1:yield_from_returns_subgenerator_value
		equals: 'returned'
%

category: 'Grail-Tests - delegation send'
method: YieldFromTestCase
testYieldFromForwardsSendToSubgenerator
	"send() resumes the SUB-generator, and its return value ends the
	delegation.  Pre-fix the value was dropped and the sub-generator
	saw None on every resume."

	| result received |
	result := testModule @env1:yield_from_forwards_send.
	received := result at: 1.
	self assert: received size equals: 3.
	self assert: (received at: 1) equals: 'a'.
	self assert: (received at: 2) equals: 'b'.
	self assert: (received at: 3) equals: 'stop'.
	self assert: (result at: 2) equals: 'sub done'
%

category: 'Grail-Tests - delegation throw'
method: YieldFromTestCase
testYieldFromForwardsThrowToSubgenerator
	"throw() is raised at the SUB-generator's suspension point; when it
	catches and yields again, that value is what throw() answers."

	| trace |
	trace := testModule @env1:yield_from_forwards_throw.
	self assert: trace size equals: 2.
	self assert: (trace at: 1) equals: 'sub caught'.
	self assert: (trace at: 2) equals: 'after'
%

category: 'Grail-Tests - delegation throw'
method: YieldFromTestCase
testYieldFromThrowIntoReturningSubgeneratorResumesDelegator
	"A sub-generator that RETURNS in response to a thrown exception
	ends the delegation with its value, and the delegator carries on
	from after the ``yield from''."

	| trace |
	trace := testModule @env1:yield_from_throw_returning_subgenerator.
	self assert: trace size equals: 2.
	self assert: (trace at: 1) equals: 'caught and returned'.
	self assert: (trace at: 2) equals: 'delegator continued'
%

category: 'Grail-Tests - delegation close'
method: YieldFromTestCase
testYieldFromForwardsCloseToSubgenerator
	"close() on the delegator closes the SUB-generator too, so its
	``finally'' runs.  Pre-fix only the delegator was closed and the
	sub-generator was left suspended forever."

	| trace |
	trace := testModule @env1:yield_from_forwards_close.
	self assert: trace size equals: 1.
	self assert: (trace at: 1) equals: 'sub finally'
%

category: 'Grail-Tests - delegation errors'
method: YieldFromTestCase
testYieldFromSendToNonGeneratorRaisesAttributeError
	"PEP 380 forwards a non-None send() with ``_i.send(_s)'', so
	delegating over a plain iterable makes send() an AttributeError
	naming ``send'' -- not the uncatchable MessageNotUnderstood the
	bare Smalltalk send produced."

	| msg |
	msg := testModule @env1:yield_from_send_to_non_generator.
	self assert: (msg includesString: 'send')
%

category: 'Grail-Tests - delegation errors'
method: YieldFromTestCase
testYieldFromOntoRunningGeneratorRaisesValueError
	"``yield from'' onto the generator that is currently running is
	Python's ValueError, and used to DEADLOCK the whole session: the
	consumer signalled the producer semaphore and then waited on a
	generator that was itself the waiter."

	| trace |
	trace := testModule @env1:yield_from_reentrant_is_value_error.
	self assert: trace size equals: 3.
	self assert: (trace at: 1) equals: 'y1'.
	self assert: (trace at: 2) equals: 'y2'.
	self assert: (trace at: 3) equals: 'generator already executing'
%

category: 'Grail-Tests - generator state'
method: YieldFromTestCase
testGeneratorGiRunningTracksBodyExecution
	"gi_running is true only while the body is executing."

	| seen |
	seen := testModule @env1:generator_gi_running.
	self assert: seen size equals: 3.
	self assert: ((seen at: 1) at: 2) equals: false.
	self assert: ((seen at: 2) at: 1) equals: 'inside'.
	self assert: ((seen at: 2) at: 2) equals: true.
	self assert: ((seen at: 3) at: 2) equals: false
%

category: 'Grail-Tests - generator state'
method: YieldFromTestCase
testGeneratorReturnValueIsDeliveredOnce
	"The return value rides the FIRST StopIteration only; the generator
	is exhausted afterwards and later next() calls report None."

	| out |
	out := testModule @env1:generator_return_value_delivered_once.
	self assert: out size equals: 2.
	self assert: (out at: 1) equals: 'the value'.
	self assert: (out at: 2) equals: None
%

category: 'Grail-Tests - generator state'
method: YieldFromTestCase
testCloseSuppressesReturnValue
	"PEP 342: close() suppresses the StopIteration, so a body that
	swallows GeneratorExit and returns leaves an EXHAUSTED generator
	rather than one still holding that value."

	self assert: testModule @env1:close_suppresses_return_value equals: None
%

category: 'Grail-Tests - generator state'
method: YieldFromTestCase
testThrownGeneratorExitPropagatesEvenWhenBodyReturns
	"throw(GeneratorExit()) propagates the THROWN exception, where
	close() absorbs it -- the distinction _forkBody used to erase by
	swallowing every GeneratorExit at the top of the body."

	self assert: testModule @env1:throw_generator_exit_propagates equals: true
%

category: 'Grail-Tests - StopIteration'
method: YieldFromTestCase
testStopIterationValueAttribute
	"PEP 380's ``value'': None by default, the first constructor
	argument otherwise, and assignable."

	| out |
	out := testModule @env1:stop_iteration_value_attribute.
	self assert: out size equals: 3.
	self assert: (out at: 1) equals: None.
	self assert: (out at: 2) equals: 'spam'.
	self assert: (out at: 3) equals: 'eggs'
%

category: 'Grail-Tests - StopIteration'
method: YieldFromTestCase
testExceptionReprUsesReprOfArgs
	"BaseException.__repr__ renders each argument with Python repr().
	Smalltalk asString stood in for it and leaked ``aNoneType'',
	``atuple'' and ``a StopIteration occurred (error 2702)''."

	| out |
	out := testModule @env1:exception_repr_uses_repr_of_args.
	self assert: (out at: 1) equals: 'StopIteration()'.
	self assert: (out at: 2) equals: 'StopIteration(''spam'')'.
	self assert: (out at: 3) equals: 'StopIteration((2,))'.
	self assert: (out at: 4) equals: 'StopIteration(None)'.
	self assert: (out at: 5) equals: 'ValueError(1, ''two'')'
%
