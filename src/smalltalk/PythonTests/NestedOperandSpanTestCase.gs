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
		   'a_deeply_nested_operand_is_blamed' )
		in: self ___fixtureModule___
		expecting: true
%

category: 'Grail-Tests - Traceback'
method: NestedOperandSpanTestCase
testAFrameThatCatchesItsOwnRaiseIsStillCoarse
	"CONTROL for the one shape the map does not reach, asserted rather than
	described so that fixing it FAILS here and has to be acknowledged.

	A ``try'' block records its position by storing ___curPos___ and reading
	that VALUE back when it catches, which is the statement's span; the map is
	keyed on (method, ip) and is never consulted.  So the frame that catches its
	own raise stays coarse while a raise from a CALLEE -- the six checks above,
	all of which cross a frame boundary -- is exact.

	Migrating the catching frame onto (method, ip) is the next change; this
	check is what will notice when it lands."

	self ___runChecks___: #( 'a_frame_that_catches_its_own_raise_is_coarse' )
		in: self ___fixtureModule___
		expecting: true
%
