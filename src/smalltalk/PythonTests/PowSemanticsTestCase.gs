! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PowSemanticsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PowSemanticsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PowSemanticsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PowSemanticsTestCase
!
! ``**'' and pow(): a negative base, a complex zero, and named parameters.
!
! THE SAME RULE, IMPLEMENTED ONCE.  A negative real raised to a non-integer
! power is COMPLEX in Python -- the angle of a negative real is pi, so the
! result is |base|**exp * (cos + i*sin)(exp*pi).  float>>__pow__: already knew
! that in detail, down to the C99 F.9.4.4 special cases.  int>>__pow__: did
! not, and GemStone's raisedTo: answers NaN, so the same expression gave two
! different answers depending on how the base was SPELLED:
!
!     (-1.0) ** 0.5     (6.123233995736766e-17+1j)
!     (-1)   ** 0.5     nan
!
! A NaN is the shape of failure that TRAVELS: it propagates through every later
! operation and is reported far from the expression that produced it.  The fix
! defers to the float method rather than restating the rule, so the special
! cases stay in one place -- and every check below is written for BOTH
! spellings, because that they agree is the property, not that either is right
! on its own.
!
! complex ** negative had the same character.  CPython's complex_pow raises
! ZeroDivisionError for a zero base to a negative or complex power; Grail's
! polar form took log(0) and its integer form inverted 0, so both answered
! nan+nanj.  The exponent being ZERO is excluded deliberately -- ``0j ** 0'' is
! 1+0j -- so the rule is "negative or complex exponent", not "non-zero".
!
! pow()'s parameters have been nameable since 3.8, precisely so it composes
! with functools.partial, and Grail read none of them: every keyword spelling
! reported ``pow expected 2 or 3 arguments''.  partial() is also why the two
! spellings have to MIX -- a partial fills some slots by name and the call site
! fills the rest by position -- which is why the arguments are now gathered
! into three slots rather than handled as two separate cases.
!
! One message was wrong rather than missing.  CPython refuses a 3-argument pow
! with a FLOAT operand from pow()'s own check (``pow() 3rd argument not allowed
! unless all arguments are integers'') and anything else from the operator
! protocol (``unsupported operand type(s)'').  Grail gave the generic one to
! both -- right for a Fraction, which test_fractions asserts, and wrong for the
! far more common float.  Its type names leaked the Smalltalk class too, so the
! float case read 'SmallDouble', which is part of why a wrong MESSAGE looked
! like a wrong type name.
!
! Drives tests/python/pow_semantics.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_pow.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PowSemanticsTestCase removeAllMethods.
PowSemanticsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PowSemanticsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pow_semantics' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pow_semantics.py')
		name: 'pow_semantics'.
%

category: 'Grail-Private'
method: PowSemanticsTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - Negative base'
method: PowSemanticsTestCase
testANegativeBaseToANonIntegerPowerIsComplex
	"Asserted for the INT and the FLOAT spelling of each base, and then that
	the two agree.  A fixture that checked only one of them would have passed
	throughout: the float side was right all along."

	#('minus_one' 'minus_eight') do: [:b |
		#('half' 'third' 'three_halves') do: [:e |
			self assertMatchesCPythonAt: 'neg_int_base_' , b , '_' , e.
			self assertMatchesCPythonAt: 'neg_float_base_' , b , '_' , e.
			self assertMatchesCPythonAt: 'neg_bases_agree_' , b , '_' , e]].
%

category: 'Grail-Tests - Negative base'
method: PowSemanticsTestCase
testIntegerExponentsKeepExactIntegerArithmetic
	"THE CONTROL for the change above.  An integer exponent must NOT enter the
	complex branch -- a float would lose precision, and 3 ** 40 is the row that
	would show it.  The inf and nan rows are the special cases float>>__pow__:
	documents, which the int path must not disturb either."

	self assertMatchesCPythonAt: 'neg_base_int_exp'.
	self assertMatchesCPythonAt: 'big_int_exact'.
	self assertMatchesCPythonAt: 'neg_int_negative_exp'.
	self assertMatchesCPythonAt: 'inf_base'.
	self assertMatchesCPythonAt: 'nan_exp_is_nan'.
%

category: 'Grail-Tests - Complex zero'
method: PowSemanticsTestCase
testAZeroComplexToANegativeOrComplexPowerRaises
	"Eight exponents, and the three that must NOT raise are the point: zero,
	one and two are ordinary arithmetic, and ``0j ** 0'' being 1+0j is why the
	guard tests for a negative or imaginary exponent rather than a non-zero
	one."

	#('neg_int' 'neg_int2' 'neg_float' 'imaginary' 'zero' 'one' 'two' 'half')
		do: [:e | self assertMatchesCPythonAt: 'zero_complex_pow_' , e].
	self assertMatchesCPythonAt: 'nonzero_complex_neg'.
	self assertMatchesCPythonAt: 'complex_zero_exponent'.
%

category: 'Grail-Tests - Named parameters'
method: PowSemanticsTestCase
testPowTakesItsParametersByName
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
%

category: 'Grail-Tests - Controls'
method: PowSemanticsTestCase
testOrdinaryPowIsUnaffected
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
%

category: 'Grail-Tests - Controls'
method: PowSemanticsTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '48 checks, 0 disagreeing [], keys match: True'
%
