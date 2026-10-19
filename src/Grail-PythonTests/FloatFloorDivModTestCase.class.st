Class {
	#name : 'FloatFloorDivModTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - float floor division' }
FloatFloorDivModTestCase >> testEveryFloatDivisionCheckAgreesWithCPython [
	"Every check in tests/python/float_floordiv_mod.py, which the fixture gate
	also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING fails
	too -- a fixture that stopped defining checks would otherwise pass this test
	with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'float_floordiv_mod' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/float_floordiv_mod.py')
		name: 'float_floordiv_mod'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_bool_dividend_follows_int'
	  'a_bool_floordiv_by_float_zero_raises'
	  'a_bool_floordiv_by_zero_raises'
	  'a_bool_mod_by_false_raises'
	  'a_large_dividend_by_an_opposite_infinity'
	  'a_nan_operand_is_nan'
	  'a_negative_dividend_keeps_the_divisor_sign'
	  'a_negative_zero_dividend_keeps_its_sign'
	  'a_same_signed_zero_quotient_is_positive'
	  'a_zero_quotient_takes_the_true_sign'
	  'a_zero_remainder_stays_positive_for_a_positive_divisor'
	  'a_zero_remainder_takes_the_divisor_sign'
	  'an_infinite_dividend_is_nan'
	  'an_int_dividend_by_infinity'
	  'an_int_dividend_by_nan'
	  'an_int_dividend_divmod_is_floats'
	  'an_int_dividend_floordiv_is_a_float'
	  'an_int_dividend_is_rounded_to_float_first'
	  'an_int_dividend_mod_by_infinity'
	  'an_int_divisor_still_yields_floats'
	  'an_int_divmod_by_float_zero_raises'
	  'an_int_floordiv_by_float_zero_raises'
	  'an_int_mod_by_float_zero_raises'
	  'an_int_too_large_for_a_float_divmod'
	  'an_int_too_large_for_a_float_floordiv'
	  'an_int_too_large_for_a_float_mod'
	  'divmod_by_a_same_signed_infinity'
	  'divmod_by_an_opposite_signed_infinity'
	  'divmod_by_zero_raises'
	  'divmod_uses_the_exact_quotient'
	  'floordiv_by_an_opposite_signed_infinity'
	  'floordiv_by_zero_raises'
	  'floordiv_of_a_negative_by_infinity'
	  'floordiv_uses_the_exact_quotient'
	  'fmod_by_zero_is_a_domain_error'
	  'fmod_of_a_larger_dividend'
	  'fmod_of_infinity_is_a_domain_error'
	  'fmod_uses_the_exact_quotient'
	  'mod_by_zero_raises'
	  'mod_uses_the_exact_quotient'
	  'ordinary_divmod'
	  'ordinary_floordiv'
	  'ordinary_mod'
	  'the_exact_quotient_scales'
	  'the_identity_holds').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 45

]

{ #category : 'Grail-Tests - float floor division' }
FloatFloorDivModTestCase >> testFloorDivisionAndModuloComeFromOneRoutine [
	"The IDENTITY that binds the two halves: ``a = b * (a // b) + a % b'' for
	every finite pair.  It is the property that computing // and % separately
	puts at risk, so it is the invariant to hold on to when either changes.

	IT DOES NOT DISCRIMINATE the old code from the new, and that is recorded
	here rather than assumed away: measured against the pre-fix tree this test
	PASSES, because the old pair was self-consistent -- ``1.0 // 0.1'' was 10.0
	with a remainder of 0.0, and 0.1 * 10.0 is exactly 1.0, so the identity
	holds on a wrong pair.  The discrimination comes from the fixture test
	beside this one; this one guards the invariant a future rewrite could break
	without the fixture noticing."

	self assert: (self eval:
'pairs = [(1.0, 0.1), (7.5, 2.0), (-7.5, 2.0), (3.0, 0.5), (-1.0, -0.1), (5.5, 0.1)]
all(a == b * (a // b) + a % b for a, b in pairs)
') equals: true

]

{ #category : 'Grail-Tests - float floor division' }
FloatFloorDivModTestCase >> testMathFmodSharesTheExactQuotient [
	"math.fmod had the same root cause and now shares the same helper, so it is
	asserted here rather than left to be rediscovered separately."

	self assert: (self eval: 'import math
(math.fmod(1.0, 0.1), math.fmod(7.5, 0.1), math.fmod(-10.0, 1.0))
') equals: (self eval: '(0.09999999999999995, 0.09999999999999959, -0.0)')

]
