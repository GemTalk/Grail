Class {
	#name : 'PowSemanticsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
PowSemanticsTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
PowSemanticsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pow_semantics' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pow_semantics.py')
		name: 'pow_semantics'.

]

{ #category : 'Grail-Tests - Negative base' }
PowSemanticsTestCase >> testANegativeBaseToANonIntegerPowerIsComplex [
	"Asserted for the INT and the FLOAT spelling of each base, and then that
	the two agree.  A fixture that checked only one of them would have passed
	throughout: the float side was right all along."

	#('minus_one' 'minus_eight') do: [:b |
		#('half' 'third' 'three_halves') do: [:e |
			self assertMatchesCPythonAt: 'neg_int_base_' , b , '_' , e.
			self assertMatchesCPythonAt: 'neg_float_base_' , b , '_' , e.
			self assertMatchesCPythonAt: 'neg_bases_agree_' , b , '_' , e]].

]

{ #category : 'Grail-Tests - Complex zero' }
PowSemanticsTestCase >> testAZeroComplexToANegativeOrComplexPowerRaises [
	"Eight exponents, and the three that must NOT raise are the point: zero,
	one and two are ordinary arithmetic, and ``0j ** 0'' being 1+0j is why the
	guard tests for a negative or imaginary exponent rather than a non-zero
	one."

	#('neg_int' 'neg_int2' 'neg_float' 'imaginary' 'zero' 'one' 'two' 'half')
		do: [:e | self assertMatchesCPythonAt: 'zero_complex_pow_' , e].
	self assertMatchesCPythonAt: 'nonzero_complex_neg'.
	self assertMatchesCPythonAt: 'complex_zero_exponent'.

]

{ #category : 'Grail-Tests - Controls' }
PowSemanticsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '48 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Negative base' }
PowSemanticsTestCase >> testIntegerExponentsKeepExactIntegerArithmetic [
	"THE CONTROL for the change above.  An integer exponent must NOT enter the
	complex branch -- a float would lose precision, and 3 ** 40 is the row that
	would show it.  The inf and nan rows are the special cases float>>__pow__:
	documents, which the int path must not disturb either."

	self assertMatchesCPythonAt: 'neg_base_int_exp'.
	self assertMatchesCPythonAt: 'big_int_exact'.
	self assertMatchesCPythonAt: 'neg_int_negative_exp'.
	self assertMatchesCPythonAt: 'inf_base'.
	self assertMatchesCPythonAt: 'nan_exp_is_nan'.

]

{ #category : 'Grail-Tests - Controls' }
PowSemanticsTestCase >> testOrdinaryPowIsUnaffected [
	"Two- and three-argument pow in every operand combination the change could
	have disturbed, plus the two refusals that were already right.

	``three_arg_float'' is the one that MOVED: CPython refuses a float operand
	from pow()'s own check and anything else from the operator protocol, and
	Grail gave the generic message to both.  A Fraction must still get the
	generic one -- test_fractions asserts that wording -- which is why the
	split is on the type rather than on the arity."

	self assertMatchesCPythonAt: 'plain_two_arg'.
	self assertMatchesCPythonAt: 'plain_three_arg'.
	self assertMatchesCPythonAt: 'three_arg_zero_mod'.
	self assertMatchesCPythonAt: 'three_arg_float'.
	self assertMatchesCPythonAt: 'zero_to_negative'.
	self assertMatchesCPythonAt: 'zero_to_negative_float'.

]

{ #category : 'Grail-Tests - Named parameters' }
PowSemanticsTestCase >> testPowTakesItsParametersByName [
	"The partial() rows are the reason these names exist, and the reason the
	two spellings have to mix in one call -- ``partial(pow, mod=10)(2, 6)''
	fills slots 1 and 2 positionally and slot 3 by name."

	self assertMatchesCPythonAt: 'kw_exp_only'.
	self assertMatchesCPythonAt: 'kw_base_exp'.
	self assertMatchesCPythonAt: 'kw_all_three'.
	self assertMatchesCPythonAt: 'partial_base'.
	self assertMatchesCPythonAt: 'partial_exp'.
	self assertMatchesCPythonAt: 'partial_mod_positional'.
	self assertMatchesCPythonAt: 'partial_mod_named'.
	self assertMatchesCPythonAt: 'no_args'.
	self assertMatchesCPythonAt: 'one_arg'.

]
