! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IntFloatOverflowTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IntFloatOverflowTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IntFloatOverflowTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IntFloatOverflowTestCase
!
! An integer too large for a float raises, rather than becoming an infinity.
!
! ``float(x)'' has always raised here -- ``int too large to convert to float'',
! CPython's own wording, from float class >> ___intToFloatChecked___.  It was
! only MIXED ARITHMETIC that coerced silently, so the SAME conversion answered
! two different things depending on whether the caller spelled it out:
!
!     float(10**1000)      OverflowError
!     1.0 + 10**1000       inf
!
! An inf is the shape of failure that TRAVELS.  It propagates through every
! later operation and is reported far from the expression that produced it, if
! at all -- sum() is the common way to reach one, and test_builtin test_sum
! adds a float to 10**1000 and expects the raise.
!
! EITHER SIDE can be the huge one, which is why there are two helpers and two
! sets of rows: ``1.0 + BIG'' coerces the OPERAND (float>>___checkedOperand___)
! and ``BIG + 1.0'' coerces the RECEIVER (int>>___checkedAgainst___).  GemStone
! answered an infinity for both, so checking one side would have left half the
! spellings wrong and the fixture would still have looked green if it only
! tried the first.
!
! THE CONTROLS ARE THE INTERESTING PART of this one.  A result-based check --
! "finite operands, infinite result" -- would have been simpler and WRONG:
! CPython does not raise for ``1e308 * 10'', which is an ordinary float
! overflow answering inf.  So the test is on the OPERAND's magnitude, and the
! controls pin that an int which fits still coerces silently, that integer
! arithmetic stays exact and unbounded, and that ordinary float overflow still
! answers inf.
!
! Drives tests/python/int_float_overflow.py, whose EXPECTED table was measured
! by RUNNING CPython 3.14.6.
!
! test_builtin's test_sum.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IntFloatOverflowTestCase removeAllMethods.
IntFloatOverflowTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IntFloatOverflowTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'int_float_overflow' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_float_overflow.py')
		name: 'int_float_overflow'.
%

category: 'Grail-Private'
method: IntFloatOverflowTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - Conversion'
method: IntFloatOverflowTestCase
testTheConversionSpelledOutStillRaises
	"This half was always right, and is here because it is the half the
	arithmetic disagreed with: one conversion, two answers, depending on
	whether the caller wrote float() or an operator."

	self assertMatchesCPythonAt: 'float_of_big'.
	self assertMatchesCPythonAt: 'float_of_fits'.
%

category: 'Grail-Tests - Mixed arithmetic'
method: IntFloatOverflowTestCase
testAFloatOnTheLeftChecksItsOperand
	self assertMatchesCPythonAt: 'float_add_big'.
	self assertMatchesCPythonAt: 'float_sub_big'.
	self assertMatchesCPythonAt: 'float_mul_big'.
	self assertMatchesCPythonAt: 'float_div_big'.
%

category: 'Grail-Tests - Mixed arithmetic'
method: IntFloatOverflowTestCase
testAnIntOnTheLeftChecksItself
	"The mirror, and not implied by the rows above: the receiver is what gets
	coerced here, so a fix to the operand check alone leaves every one of
	these answering inf."

	self assertMatchesCPythonAt: 'big_add_float'.
	self assertMatchesCPythonAt: 'big_sub_float'.
	self assertMatchesCPythonAt: 'big_mul_float'.
	self assertMatchesCPythonAt: 'big_div_float'.
%

category: 'Grail-Tests - sum'
method: IntFloatOverflowTestCase
testSumReachesItFromEitherOrder
	"sum() is how the corpus meets this, and the order matters because it
	decides which operand the running total is."

	self assertMatchesCPythonAt: 'sum_float_then_big'.
	self assertMatchesCPythonAt: 'sum_big_then_float'.
	self assertMatchesCPythonAt: 'sum_complex_then_big'.
%

category: 'Grail-Tests - Controls'
method: IntFloatOverflowTestCase
testOrdinaryFloatOverflowStillAnswersInf
	"THE CONTROL THAT SHAPED THE FIX.  A result-based check -- finite
	operands, infinite result -- is simpler and WRONG: CPython does not raise
	for ``1e308 * 10''.  So the test is on the OPERAND's magnitude, and this
	row is what says so."

	self assertMatchesCPythonAt: 'ordinary_float_overflow'.
%

category: 'Grail-Tests - Controls'
method: IntFloatOverflowTestCase
testNothingThatWorkedStoppedWorking
	"An int that fits still coerces silently, integer arithmetic stays exact
	and unbounded, ordinary mixed arithmetic is untouched, and comparisons --
	which coerce too -- are not in scope."

	self assertMatchesCPythonAt: 'float_add_fits'.
	self assertMatchesCPythonAt: 'big_plus_big_is_exact'.
	self assertMatchesCPythonAt: 'big_int_arithmetic'.
	self assertMatchesCPythonAt: 'small_mixed'.
	self assertMatchesCPythonAt: 'comparison_unaffected'.
%

category: 'Grail-Tests - Controls'
method: IntFloatOverflowTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '19 checks, 0 disagreeing [], keys match: True'
%
