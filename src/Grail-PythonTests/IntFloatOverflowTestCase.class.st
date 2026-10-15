Class {
	#name : 'IntFloatOverflowTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IntFloatOverflowTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
IntFloatOverflowTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'int_float_overflow' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/int_float_overflow.py')
		name: 'int_float_overflow'.

]

{ #category : 'Grail-Tests - Mixed arithmetic' }
IntFloatOverflowTestCase >> testAFloatOnTheLeftChecksItsOperand [
	self assertMatchesCPythonAt: 'float_add_big'.
	self assertMatchesCPythonAt: 'float_sub_big'.
	self assertMatchesCPythonAt: 'float_mul_big'.
	self assertMatchesCPythonAt: 'float_div_big'.

]

{ #category : 'Grail-Tests - Mixed arithmetic' }
IntFloatOverflowTestCase >> testAnIntOnTheLeftChecksItself [
	"The mirror, and not implied by the rows above: the receiver is what gets
	coerced here, so a fix to the operand check alone leaves every one of
	these answering inf."

	self assertMatchesCPythonAt: 'big_add_float'.
	self assertMatchesCPythonAt: 'big_sub_float'.
	self assertMatchesCPythonAt: 'big_mul_float'.
	self assertMatchesCPythonAt: 'big_div_float'.

]

{ #category : 'Grail-Tests - Controls' }
IntFloatOverflowTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '19 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
IntFloatOverflowTestCase >> testNothingThatWorkedStoppedWorking [
	"An int that fits still coerces silently, integer arithmetic stays exact
	and unbounded, ordinary mixed arithmetic is untouched, and comparisons --
	which coerce too -- are not in scope."

	self assertMatchesCPythonAt: 'float_add_fits'.
	self assertMatchesCPythonAt: 'big_plus_big_is_exact'.
	self assertMatchesCPythonAt: 'big_int_arithmetic'.
	self assertMatchesCPythonAt: 'small_mixed'.
	self assertMatchesCPythonAt: 'comparison_unaffected'.

]

{ #category : 'Grail-Tests - Controls' }
IntFloatOverflowTestCase >> testOrdinaryFloatOverflowStillAnswersInf [
	"THE CONTROL THAT SHAPED THE FIX.  A result-based check -- finite
	operands, infinite result -- is simpler and WRONG: CPython does not raise
	for ``1e308 * 10''.  So the test is on the OPERAND's magnitude, and this
	row is what says so."

	self assertMatchesCPythonAt: 'ordinary_float_overflow'.

]

{ #category : 'Grail-Tests - sum' }
IntFloatOverflowTestCase >> testSumReachesItFromEitherOrder [
	"sum() is how the corpus meets this, and the order matters because it
	decides which operand the running total is."

	self assertMatchesCPythonAt: 'sum_float_then_big'.
	self assertMatchesCPythonAt: 'sum_big_then_float'.
	self assertMatchesCPythonAt: 'sum_complex_then_big'.

]

{ #category : 'Grail-Tests - Conversion' }
IntFloatOverflowTestCase >> testTheConversionSpelledOutStillRaises [
	"This half was always right, and is here because it is the half the
	arithmetic disagreed with: one conversion, two answers, depending on
	whether the caller wrote float() or an operator."

	self assertMatchesCPythonAt: 'float_of_big'.
	self assertMatchesCPythonAt: 'float_of_fits'.

]
