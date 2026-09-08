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
		   'a_frame_that_catches_its_own_raise_is_blamed' )
		in: self ___fixtureModule___
		expecting: true
%

category: 'Grail-Tests - Traceback'
method: NestedOperandSpanTestCase
testAMultiLineExpressionKeepsTheStatementsLine
	"CONTROL for the one shape still coarse, asserted rather than described so
	that fixing it FAILS here and has to be acknowledged.

	The map refines COLUMNS only, never a frame's line.  Refining the line would
	be right for a raise -- CPython blames the line the operation is on -- but
	the LIVE frame chain (sys._getframe, traceback.walk_stack) holds ips of a
	different kind from an exception capture's, and for those
	``_previousStepPointForIp:'' names the last COMPLETED send rather than the
	one in progress: an argument's line where CPython reports the call's.  Two
	test_traceback tests measured that (TestStack.test_format_locals and
	test_custom_format_frame), so the guard is that the map and codegen must
	already agree about the line.

	A multi-line expression is where they cannot agree, so it keeps the
	statement's line and the statement's span.  Closing it needs the live
	chain's step point fixed, which is its own change."

	self ___runChecks___: #( 'a_multi_line_expression_keeps_the_statements_line' )
		in: self ___fixtureModule___
		expecting: true
%
