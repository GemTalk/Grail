! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FloatFloorDivModTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FloatFloorDivModTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FloatFloorDivModTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FloatFloorDivModTestCase - float //, % and divmod derived from one routine
! ===============================================================================
! CPython derives all three from a single function, float_divmod
! (Objects/floatobject.c).  Grail computed each separately, and they drifted from
! upstream in three independent ways -- each invisible unless you pick the
! operand that exposes it:
!
!   1. THE EXACT QUOTIENT.  fmod(x, y) is ``x - n*y'' with n = trunc(x/y) taken
!      from the TRUE quotient.  GemStone's rem: takes it from the ROUNDED one,
!      and the two differ whenever the true quotient sits just below an integer.
!      The stored 0.1 is slightly MORE than a tenth, so 1.0/0.1 is really
!      9.999..., n is 9, and fmod(1.0, 0.1) is 0.09999999999999995 -- while the
!      rounded quotient is exactly 10.0, n is 10, and ``1.0 rem: 0.1'' is 0.0.
!      That ONE substitution accounted for ``1.0 // 0.1 = 10.0'' (CPython: 9.0),
!      for a whole family of zero remainders, and for math.fmod as well.
!
!   2. THE QUOTIENT'S SHARE OF THE SIGN FIX.  When the remainder does not carry
!      the divisor's sign, upstream shifts it one divisor up AND drops the
!      quotient by one.  Grail did the first half only, so ``0.1 // -inf'' was
!      0.0 where CPython says -1.0.
!
!   3. THE SIGNED ZERO QUOTIENT.  A zero quotient takes the sign of the true
!      quotient, so ``0.0 // -1.0'' is -0.0 and not 0.0.
!
! HOW WIDE IT WAS, measured before and after over a 221-row cross product of
! representative dividends and divisors (including both infinities, both zeros
! and NaN) against CPython 3.14: 56 rows disagreed, 0 do now.
!
! THE FIX IS THE DERIVATION, not the three answers: float>>___pyDivModPair___ is
! CPython's routine, float>>___pyFmod___ is the exact fmod under it, and //, %,
! divmod and math.fmod all now come from there.  Computing them apart is what
! let them drift, so a future change belongs in the shared routine.
!
! COST, measured: float % and // go from ~0.2 to ~1.0 us, the price of exact
! Fraction arithmetic for the quotient.  There is no cheap SOUND shortcut --
! the whole defect is that a rounded quotient LOOKS correct -- so the only
! early-out taken is |x| < |y|, where n is 0 by inspection.
!
! tests/python/float_floordiv_mod.py holds the 29 checks below and is run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FloatFloorDivModTestCase removeAllMethods.
FloatFloorDivModTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - float floor division'
method: FloatFloorDivModTestCase
testEveryFloatDivisionCheckAgreesWithCPython
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
	names := #('a_large_dividend_by_an_opposite_infinity'
	  'a_nan_operand_is_nan'
	  'a_negative_dividend_keeps_the_divisor_sign'
	  'a_negative_zero_dividend_keeps_its_sign'
	  'a_same_signed_zero_quotient_is_positive'
	  'a_zero_quotient_takes_the_true_sign'
	  'a_zero_remainder_stays_positive_for_a_positive_divisor'
	  'a_zero_remainder_takes_the_divisor_sign'
	  'an_infinite_dividend_is_nan'
	  'an_int_divisor_still_yields_floats'
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
	self assert: names size equals: 29
%

category: 'Grail-Tests - float floor division'
method: FloatFloorDivModTestCase
testFloorDivisionAndModuloComeFromOneRoutine
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
%

category: 'Grail-Tests - float floor division'
method: FloatFloorDivModTestCase
testMathFmodSharesTheExactQuotient
	"math.fmod had the same root cause and now shares the same helper, so it is
	asserted here rather than left to be rediscovered separately."

	self assert: (self eval: 'import math
(math.fmod(1.0, 0.1), math.fmod(7.5, 0.1), math.fmod(-10.0, 1.0))
') equals: (self eval: '(0.09999999999999995, 0.09999999999999959, -0.0)')
%
