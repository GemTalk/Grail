! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ShortCircuitOperandSpanTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ShortCircuitOperandSpanTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ShortCircuitOperandSpanTestCase - a traceback blames the operand that raised.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ShortCircuitOperandSpanTestCase removeAllMethods.
ShortCircuitOperandSpanTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback'
method: ShortCircuitOperandSpanTestCase
testAShortCircuitOperandIsBlamedForItsOwnRaise
	"CPython's PEP 657 span is the RAISING OPERATION.  Grail records one
	``___curPos___'' store per statement, naming the statement's value
	expression, so ``x = 1 / 0 and 2.0'' underlined the whole ``and'' -- columns
	9..22 where CPython gives 9..14, the division.  That was the last failure in
	test_traceback (test_summary_should_show_carets), which asserts the mock was
	called with exactly those two numbers.

	A SHORT-CIRCUIT IS THE ONE NESTED SHAPE THIS CAN FOLLOW CHEAPLY, and the
	reason is that Grail already emits its later operands inside blocks: the
	first operand is named by the statement's own store, narrowed onto it by
	___curPosSpanNodeFor___:, and each later operand by a store at the top of
	the block that guards it.  No new block, no new allocation.

	THE TWO HALVES FAIL DIFFERENT CHECKS, which is how they were verified:
	dropping the narrowing loses the three first-operand checks, dropping the
	block stores loses the four later-operand ones.

	THE LAST TWO USED TO BE CONTROLS for what this could not fix -- ``1 / 0 + 5''
	and a conditional expression, which need a store before each nested
	operation and have no statement boundary to hang one on.  A position map
	from Smalltalk offset to Python node reaches them without any store at all,
	so they are now exact and asserted as such."

	| mod |
	importlib @env1:modules removeKey: #'short_circuit_operand_span' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/short_circuit_operand_span.py')
		name: 'short_circuit_operand_span'.
	#( 'the_first_operand_of_and_is_blamed'
	   'the_second_operand_of_and_is_blamed'
	   'the_first_operand_of_or_is_blamed'
	   'the_second_operand_of_or_is_blamed'
	   'the_third_operand_of_a_chain_is_blamed'
	   'a_nested_short_circuit_reaches_the_inner_operand'
	   'a_return_inside_a_function_is_blamed_the_same_way'
	   "Controls: nothing that already agreed with CPython may move."
	   'a_statement_with_no_short_circuit_is_unchanged'
	   'the_frame_after_a_short_circuit_keeps_its_own_span'
	   "Was a control for the general nested case being out of reach; now a
	   conformance check, because the position map reaches it.  Kept and
	   TIGHTENED rather than deleted: these two go through exec(), so they are
	   what notices if a doit stops carrying a map."
	   'a_binary_operand_is_narrowed'
	   'a_conditional_expression_is_narrowed' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'short-circuit span check failed: ' , k , ' -> '
				, answer printString]
%
