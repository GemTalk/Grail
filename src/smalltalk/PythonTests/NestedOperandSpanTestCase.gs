! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NestedOperandSpanTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedOperandSpanTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedOperandSpanTestCase - a traceback blames the operation, however nested.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NestedOperandSpanTestCase removeAllMethods.
NestedOperandSpanTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback'
method: NestedOperandSpanTestCase
___runChecks___: names in: aModule expecting: aBoolean
	"Run each named check in aModule and assert it answers aBoolean.

	The checks are the fixture's OWN functions, the same ones
	scripts/check_python_fixtures.sh runs under CPython, so the expected spans
	are CPython's by construction rather than by transcription -- and they
	reach Grail's answer through the public ``traceback'' module, not through
	any internal position API."

	names do: [:k |
		| answer |
		answer := [aModule perform: k asSymbol env: 1 withArguments: #()]
			on: (Python at: #'BaseException')
			do: [:ex | ex return: 'RAISED ' , ex class name asString].
		self assert: answer = aBoolean
			description: k , ': expected ' , aBoolean printString
				, ' but the fixture answered ' , answer printString]
%

category: 'Grail-Tests - Traceback'
method: NestedOperandSpanTestCase
___fixtureModule___
	"tests/python/nested_operand_span.py, freshly imported."

	importlib @env1:modules removeKey: #'nested_operand_span' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nested_operand_span.py')
		name: 'nested_operand_span'
%

category: 'Grail-Tests - Traceback'
method: NestedOperandSpanTestCase
testANestedOperandIsBlamedForItsOwnRaise
	"The traceback reads the position map, so a nested operand is exact.

	Grail recovered a frame's position by text-scanning the ``___curPos___''
	store codegen emits once per STATEMENT, which cannot name anything smaller
	than the statement: ``1 / 0 + 5'' underlined the addition.  PR #841 reached
	the one cheap shape -- a short-circuit operand, already emitted inside a
	block -- and recorded the others as out of reach, needing a store before
	every nested operation with no statement boundary to hang one on.

	The map needs no store at all.  GemStone answers, for any ip, the SMALLTALK
	offset of the send in flight; the map says which Python node occupies that
	offset; and the innermost one containing it is what CPython blames.  All six
	shapes here come out of that single rule -- there is no per-shape code to
	point at, which is why the check is a list rather than a method each.

	THROUGH THE PUBLIC API.  These call ``traceback.TracebackException'' and
	compare four numbers, so they exercise the whole path -- capture, frame
	walk, span refinement, FrameSummary -- and not just the resolver.  The
	resolver on its own is PythonOffsetMapTestCase's job."

	self ___runChecks___:
		#( 'the_operand_of_a_binary_op_is_blamed'
		   'a_tuple_element_is_blamed'
		   'the_test_of_a_conditional_is_blamed'
		   'a_subscript_operand_is_blamed'
		   'an_argument_after_a_call_is_blamed'
		   'a_deeply_nested_operand_is_blamed'
		   "The frame that catches its OWN raise -- see
		   BaseException >> ___refineCatcherPos___:span:.  It was a control here
		   for being out of reach, and reaching it took its own step: such a
		   frame is suspended at the ``on:do:'' send, so the map answers nothing
		   for its ip and the columns have to come from the protected block's
		   span instead."
		   'a_frame_that_catches_its_own_raise_is_blamed'
		   "A multi-line expression: the statement starts a line above the
		   division that raises, and CPython blames the division's line.  This
		   was the fixture's XFAIL until a frame's LINE began to come from the
		   same map lookup as its columns -- see
		   BaseException >> ___tracebackLineForMethod___:ip:."
		   'a_multi_line_expression_is_blamed_on_the_operations_line' )
		in: self ___fixtureModule___
		expecting: true
%

category: 'Grail-Tests - Traceback'
method: NestedOperandSpanTestCase
testALiveFrameIsBlamedOnTheCallItIsMaking
	"A live frame is blamed on the line of the call it is EXECUTING, which for
	a call split across two lines is the first of them -- as in CPython.

	This was a control on a supposed TRADE, and the trade turned out not to
	exist.  Two explanations have now been retired from it, which is why the
	history is kept.  The first said the live chain holds ips ``of a different
	kind'', for which the step point names the last COMPLETED send; measurement
	said otherwise -- both walks read _gsStack through ___toPortableIps___:,
	___framesOfSuspendedProcess___: never supplies the frame in question, and a
	caller frame on the raise path resolves exactly.

	The second said Grail must keep a COARSE statement line here because
	``traceback.walk_stack'' is eager where CPython's is a generator, so the two
	capture at different lines of one statement.  The premise was right and the
	conclusion was not: the eagerness was the defect, not something to design
	around.  Coarseness only HID it, and hid it selectively -- with the IR
	position map the same code diverged from CPython outright:

		text path:  5  'return traceback.StackSummary.extract('   == CPython
		IR path:    6  'traceback.walk_stack(None), limit=1)'     != CPython

	walk_stack is a generator now, so the chain is captured while the caller
	sits at the call it is actually making, and both paths answer 5.  The
	fixture's assertion never changed; what changed is that it holds for
	CPython's own reason rather than by luck."

	self ___runChecks___: #( 'a_live_frame_is_blamed_on_the_call_it_is_making' )
		in: self ___fixtureModule___
		expecting: true
%
