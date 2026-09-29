! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FractionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FractionTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FractionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FractionTestCase - Tests for Grail's TWO fractions.Fraction
!
! There are two, and which one a test gets depends on how it asks:
!
!   fractions @env1:instance -- the NATIVE module, src/smalltalk/Python/fractions.gs,
!       whose `Fraction' accessor answers GemStone's own KERNEL Fraction class.  So
!       `fracClass ___new___: fracClass _: 1 _: 3' builds a kernel SmallFraction,
!       identical (==) to what 1/3 evaluates to in Smalltalk.  Most tests in this
!       file take that path, so most of this file covers the kernel fraction.
!
!   self eval: 'import fractions' -- the VENDORED pure-Python module,
!       src/python/stdlib/fractions.py, which shadows the native one on the search
!       path.  This is what ordinary Python code gets.
!
! The distinction bites: a test that compares `Fraction(1, 3)' across the two
! paths compares an object with ITSELF along the first, and so passes whatever
! __hash__ happens to do.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FractionTestCase removeAllMethods.
FractionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Rounding'
method: FractionTestCase
test__ceil__
	"Test __ceil__ returns smallest integer >= self"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"ceil(3/2) = 2"
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f @env1:__ceil__) equals: 2.

	"ceil(5/1) = 5"
	f := fracClass ___new___: fracClass _: 5 _: 1.
	self assert: (f @env1:__ceil__) equals: 5.

	"ceil(-3/2) = -1 (ceil goes toward positive infinity)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f @env1:__ceil__) equals: -1.

	"ceil(-5/1) = -5"
	f := fracClass ___new___: fracClass _: -5 _: 1.
	self assert: (f @env1:__ceil__) equals: -5.
%

category: 'Grail-Tests - Rounding'
method: FractionTestCase
test__floor__
	"Test __floor__ returns largest integer <= self"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"floor(3/2) = 1"
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f @env1:__floor__) equals: 1.

	"floor(5/1) = 5"
	f := fracClass ___new___: fracClass _: 5 _: 1.
	self assert: (f @env1:__floor__) equals: 5.

	"floor(-3/2) = -2 (floor goes toward negative infinity)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f @env1:__floor__) equals: -2.

	"floor(-5/1) = -5"
	f := fracClass ___new___: fracClass _: -5 _: 1.
	self assert: (f @env1:__floor__) equals: -5.
%

category: 'Grail-Tests - Format'
method: FractionTestCase
test__format__Empty
	"Test __format__('') returns str(self)"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f @env1:__format__: ''.
	self assert: result equals: '3/2'.
%

category: 'Grail-Tests - Format'
method: FractionTestCase
test__format__Nil
	"Test __format__(nil) returns str(self)"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f @env1:__format__: nil.
	self assert: result equals: '3/2'.
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
test__hash__
	"Test __hash__ returns an integer"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f @env1:__hash__.
	self assert: (result isKindOf: Integer).
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testNumericHashConsistency
	"CPython requires equal numeric values to hash equally across int,
	float and Fraction (test_fractions testHash).  Regresses three linked
	fixes: int.__hash__ = n mod (2**61 - 1); float.__hash__ = the same
	numeric hash of the exact dyadic value; and 3-arg pow(a, -1, m)
	returning the integer modular inverse (fractions._hash_algorithm relies
	on it -- it used to return the float a**-1, poisoning every non-trivial
	Fraction hash).  Uses a fresh `import fractions` (not the canonical
	module singleton) so the module rebuilds from disk against the current
	pow/hash code."

	"hash(F(5,2)) == hash(2.5): the fraction path runs pow(2, -1, P)."
	self assert: (self eval: 'import fractions
hash(fractions.Fraction(5, 2)) == hash(2.5)').

	"hash(F(2)) == hash(2) == hash(2.0): integer-valued consistency."
	self assert: (self eval: 'import fractions
hash(fractions.Fraction(2, 1)) == hash(2) and hash(2.0) == hash(2)').

	"hash(F(10**50)) == hash(10**50): the large-int path, where the old
	float-valued pow(1, -1, P) collapsed the hash to a lossy float."
	self assert: (self eval: 'import fractions
hash(fractions.Fraction(10**50)) == hash(10**50)').

	"hash(float(10**23)) != hash(F(10**23)): the float is inexact, so its
	numeric hash must differ from the exact integer's."
	self assert: (self eval: 'import fractions
hash(float(10**23)) != hash(fractions.Fraction(10**23))').
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testKernelFractionHashesLikeTheEqualFloat
	"GemStone's own Fraction -- what 1/2 evaluates to in Smalltalk, not
	fractions.Fraction -- used to answer the Smalltalk `self hash'.  That is
	a different number from the numeric hash of the equal float, and
	CPython's contract is that equal numbers hash equally whatever their
	type (#1258)."

	self assert: ((1/2) @env1:__hash__) equals: (0.5 @env1:__hash__).
	self assert: ((1/2) @env1:__hash__) equals: 1152921504606846976
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testNegativeKernelFractionHashesLikeTheEqualFloat
	"CPython hashes |numerator|/denominator and negates the result, rather
	than reducing a negative numerator mod P.  Those two give different
	answers, so the sign is a branch of its own."

	self assert: ((-5/2) @env1:__hash__) equals: (-2.5 @env1:__hash__).
	self assert: ((-5/2) @env1:__hash__) equals: -1152921504606846978
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testLargeKernelFractionHashesAsCPythonDoes
	"No float equals 1/3, so only a pinned literal can witness these two.
	Both are CPython 3.14's own hash of the same rational, measured with
	fractions.Fraction.  10**50/3 is a Fraction rather than a SmallFraction,
	and is the only test here that reaches the large-fraction class.

	Comparing the two spellings against EACH OTHER would prove nothing: the
	native module's Fraction IS the kernel class, so `Fraction(1, 3)' along
	that path answers the very object 1/3 does."

	self assert: ((1/3) @env1:__hash__) equals: 1537228672809129301.
	self assert: (((10 raisedTo: 50) / 3) @env1:__hash__) equals: 975058526797455899
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testKernelFractionWhoseDenominatorIsAMultipleOfTheModulusHashesAsInfinity
	"A denominator that is a multiple of P = 2**61 - 1 has no inverse mod P,
	and CPython answers _PyHASH_INF there, signed by the numerator.  Neither
	a float nor a ScaledDecimal can reach this branch -- their denominators
	are powers of 2 and of 10 -- so only a fraction tests it."

	self assert: ((1 / 2305843009213693951) @env1:__hash__) equals: 314159.
	self assert: ((-1 / 2305843009213693951) @env1:__hash__) equals: -314159
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testADictKeyedByAKernelFractionIsFoundByTheEqualFloat
	"The symptom #1258 reports.  A dict finds a key by hash first, so two
	equal numbers that hash differently land in different buckets and 0.5
	missed the entry 1/2 had made."

	| dictionary |
	dictionary := PyDict new.
	dictionary @env1:__setitem__: (1/2) _: 'half'.

	self assert: (dictionary @env1:__getitem__: 0.5) equals: 'half'
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testStoringUnderAFloatReplacesTheEqualKernelFractionEntry
	"The direction that makes the dict itself wrong rather than merely
	unhelpful: 1/2 and 0.5 are ONE key, so either store must replace the
	other and leave a dict of size one.  While they hashed differently a
	single dict held both, and iterating it yielded the same number twice."

	| dictionary |
	dictionary := PyDict new.
	dictionary @env1:__setitem__: (1/2) _: 'from the fraction'.
	dictionary @env1:__setitem__: 0.5 _: 'from the float'.

	self assert: (dictionary @env1:__len__) equals: 1.
	self assert: (dictionary @env1:__getitem__: (1/2)) equals: 'from the float'
%

category: 'Grail-Tests - Repr'
method: FractionTestCase
test__repr__
	"Test repr(Fraction) format matches CPython: 'Fraction(n, d)'"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f @env1:__repr__.
	self assert: result equals: 'Fraction(3, 2)'.

	f := fracClass ___new___: fracClass _: -1 _: 2.
	result := f @env1:__repr__.
	self assert: result equals: 'Fraction(-1, 2)'.

	"Note: Fraction(0, 1) in GemStone becomes SmallInteger 0, not a Fraction
	 because GemStone canonicalizes fractions equivalent to integers"
%

category: 'Grail-Tests - Rounding'
method: FractionTestCase
test__round__
	"Test __round__ rounds to nearest integer, ties to even"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"round(3/2) = 2 (1.5 rounds to 2, the even number)"
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f @env1:__round__) equals: 2.

	"round(5/2) = 2 (2.5 rounds to 2, the even number)"
	f := fracClass ___new___: fracClass _: 5 _: 2.
	self assert: (f @env1:__round__) equals: 2.

	"round(7/2) = 4 (3.5 rounds to 4, the even number)"
	f := fracClass ___new___: fracClass _: 7 _: 2.
	self assert: (f @env1:__round__) equals: 4.

	"round(7/4) = 2 (1.75 rounds to 2)"
	f := fracClass ___new___: fracClass _: 7 _: 4.
	self assert: (f @env1:__round__) equals: 2.

	"round(-3/2) = -2 (-1.5 rounds to -2, the even number)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f @env1:__round__) equals: -2.
%

category: 'Grail-Tests - Rounding'
method: FractionTestCase
test__round__WithNdigits
	"Test __round__(ndigits)"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"round(7/4, 1) should give Fraction close to 1.8"
	f := fracClass ___new___: fracClass _: 7 _: 4.
	result := f @env1:__round__: 1.
	"Result should be 9/5 = 1.8"
	self assert: ((result @env1:__float__) - 1.8) abs < 0.0001.

	"round with ndigits=0 returns integer"
	f := fracClass ___new___: fracClass _: 7 _: 4.
	result := f @env1:__round__: 0.
	self assert: (result isKindOf: Integer).
	self assert: result equals: 2.
%

category: 'Grail-Tests - Fraction Methods'
method: FractionTestCase
testAs_integer_ratio
	"Test as_integer_ratio returns (numerator, denominator) tuple"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f @env1:as_integer_ratio.
	"Use 0-based Python indexing"
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 2.

	f := fracClass ___new___: fracClass _: -5 _: 4.
	result := f @env1:as_integer_ratio.
	self assert: (result @env1:__getitem__: 0) equals: -5.
	self assert: (result @env1:__getitem__: 1) equals: 4.
%

category: 'Grail-Tests - Negative Conversion'
method: FractionTestCase
testBoolNegative
	"Test __bool__ for negative fractions (any non-zero is True)"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f @env1:__bool__).

	f := fracClass ___new___: fracClass _: -1 _: 1.
	self assert: (f @env1:__bool__).
%

category: 'Grail-Tests - Canonical Form & Signs'
method: FractionTestCase
testCanonicalFormEquality
	"Test that equivalent fractions are equal (e.g., 1/2 == 2/4)"

	| fm fracClass f1 f2 |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f1 := fracClass ___new___: fracClass _: 1 _: 2.
	f2 := fracClass ___new___: fracClass _: 2 _: 4.
	self assert: (f1 @env1:__eq__: f2).
	"After reduction, both should have same numerator/denominator"
	self assert: (f1 @env1:numerator) equals: (f2 @env1:numerator).
	self assert: (f1 @env1:denominator) equals: (f2 @env1:denominator).
%

category: 'Grail-Tests - Conversion'
method: FractionTestCase
testConversionsAndBool
	"Test __int__, __float__ and __bool__ on Fraction"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f @env1:__int__) equals: 1.
	self assert: ((f @env1:__float__) - 1.5) abs < 0.0001.
	self assert: (f @env1:__bool__).
	f := fracClass ___new___: fracClass _: 0 _: 1.
	self deny: (f @env1:__bool__).
%

category: 'Grail-Tests - Creation'
method: FractionTestCase
testCreateFromFraction
	"Test Fraction(Fraction(1, 3)) returns an equivalent fraction"

	| fm fracClass f1 f2 |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f1 := fracClass ___new___: fracClass _: 1 _: 3.
	f2 := fracClass ___new___: fracClass _: f1.
	self assert: (f2 @env1:__eq__: f1).
%

category: 'Grail-Tests - Creation'
method: FractionTestCase
testCreateFromIntegers
	"Test Fraction(1, 2) construction"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f := fracClass ___new___: fracClass _: 1 _: 2.
	self assert: (f @env1:numerator) equals: 1.
	self assert: (f @env1:denominator) equals: 2.
	self assert: (f @env1:__str__) equals: '1/2'.
%

category: 'Grail-Tests - Creation'
method: FractionTestCase
testCreateFromSingleInteger
	"Test Fraction(3) construction"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f := fracClass ___new___: fracClass _: 3.
	self assert: (f @env1:__int__) equals: 3.
	self assert: (f @env1:__float__) equals: 3.0.
%

category: 'Grail-Tests - Negative Conversion'
method: FractionTestCase
testFloatNegative
	"Test __float__ for negative fractions"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: ((f @env1:__float__) - -1.5) abs < 0.0001.

	f := fracClass ___new___: fracClass _: -1 _: 4.
	self assert: ((f @env1:__float__) - -0.25) abs < 0.0001.
%

category: 'Grail-Tests - Module Binding'
method: FractionTestCase
testFractionsModuleProvidesFraction
	"Test that fractions module exposes the Fraction type"

	| fm fracClass |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	self assert: fracClass equals: Fraction.
%

category: 'Grail-Tests - Class Methods'
method: FractionTestCase
testFrom_decimal
	"Test Fraction.from_decimal() class method"

	| fm fracClass dec f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"Create a Decimal (ScaledDecimal) with value 0.5"
	dec := ScaledDecimal for: 0.5 scale: 2.
	f := fracClass @env1:from_decimal: dec.
	self assert: ((f @env1:__float__) - 0.5) abs < 0.0001.
%

category: 'Grail-Tests - Class Methods'
method: FractionTestCase
testFrom_float
	"Test Fraction.from_float() class method"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"0.5 should give 1/2"
	f := fracClass @env1:from_float: 0.5.
	self assert: (f @env1:numerator) equals: 1.
	self assert: (f @env1:denominator) equals: 2.

	"Integer argument should work"
	f := fracClass @env1:from_float: 5.
	self assert: (f @env1:numerator) equals: 5.
	self assert: (f @env1:denominator) equals: 1.

	"Negative float"
	f := fracClass @env1:from_float: -0.25.
	self assert: (f @env1:numerator) equals: -1.
	self assert: (f @env1:denominator) equals: 4.
%

category: 'Grail-Tests - Class Methods'
method: FractionTestCase
testFrom_floatRaisesOnInfinity
	"Test Fraction.from_float() raises on Infinity"

	| fm fracClass inf |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	inf := 1.0 / 0.0.  "Create Infinity"
	self
		should: [fracClass @env1:from_float: inf]
		raise: ValueError.
%

category: 'Grail-Tests - Class Methods'
method: FractionTestCase
testFrom_floatRaisesOnNaN
	"Test Fraction.from_float() raises on NaN"

	| fm fracClass nan |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	nan := 0.0 / 0.0.  "Create NaN"
	self
		should: [fracClass @env1:from_float: nan]
		raise: ValueError.
%

category: 'Grail-Tests - Class Methods'
method: FractionTestCase
testFrom_number
	"Test Fraction.from_number() class method with objects having as_integer_ratio"

	| fm fracClass f origFrac |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"Float has as_integer_ratio"
	f := fracClass @env1:from_number: 0.5.
	self assert: (f @env1:numerator) equals: 1.
	self assert: (f @env1:denominator) equals: 2.

	"Fraction has as_integer_ratio"
	origFrac := fracClass ___new___: fracClass _: 3 _: 4.
	f := fracClass @env1:from_number: origFrac.
	self assert: (f @env1:__eq__: origFrac).
%

category: 'Grail-Tests - Hash'
method: FractionTestCase
testHashEqualityConsistency
	"Test that equal fractions have equal hashes"

	| fm fracClass f1 f2 f3 h1 h2 h3 |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"1/2 and 2/4 are equal, so their hashes must match"
	f1 := fracClass ___new___: fracClass _: 1 _: 2.
	f2 := fracClass ___new___: fracClass _: 2 _: 4.
	h1 := f1 @env1:__hash__.
	h2 := f2 @env1:__hash__.
	self assert: h1 equals: h2.

	"-1/2 and 1/-2 are equal, so their hashes must match"
	f1 := fracClass ___new___: fracClass _: -1 _: 2.
	f3 := fracClass ___new___: fracClass _: 1 _: -2.
	h1 := f1 @env1:__hash__.
	h3 := f3 @env1:__hash__.
	self assert: h1 equals: h3.
%

category: 'Grail-Tests - Negative Conversion'
method: FractionTestCase
testIntTruncationTowardZeroNegative
	"Test __int__ truncates toward zero for negative fractions (CPython behavior)"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"int(-3/2) should be -1, not -2 (truncation toward zero)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f @env1:__int__) equals: -1.

	"int(-7/4) should be -1"
	f := fracClass ___new___: fracClass _: -7 _: 4.
	self assert: (f @env1:__int__) equals: -1.

	"int(-5/5) should be -1"
	f := fracClass ___new___: fracClass _: -5 _: 5.
	self assert: (f @env1:__int__) equals: -1.
%

category: 'Grail-Tests - Fraction Methods'
method: FractionTestCase
testIs_integer
	"Test is_integer returns True when denominator is 1"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	f := fracClass ___new___: fracClass _: 5 _: 1.
	self assert: (f @env1:is_integer).

	f := fracClass ___new___: fracClass _: -3 _: 1.
	self assert: (f @env1:is_integer).

	f := fracClass ___new___: fracClass _: 3 _: 2.
	self deny: (f @env1:is_integer).

	f := fracClass ___new___: fracClass _: 6 _: 3.
	"After reduction, 6/3 = 2/1, so is_integer should be true"
	self assert: (f @env1:is_integer).
%

category: 'Grail-Tests - Limit Denominator'
method: FractionTestCase
testLimit_denominatorDefault
	"Test limit_denominator() with default max (10**6)"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"Fraction with denominator within limit stays the same"
	f := fracClass ___new___: fracClass _: 1 _: 3.
	result := f @env1:limit_denominator.
	self assert: (result @env1:__eq__: f).
%

category: 'Grail-Tests - Limit Denominator'
method: FractionTestCase
testLimit_denominatorSmall
	"Test limit_denominator with small max values"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"1/3 with max_denominator=2 should give 1/2 (closest with d <= 2)"
	f := fracClass ___new___: fracClass _: 1 _: 3.
	result := f @env1:limit_denominator: 2.
	self assert: (result @env1:denominator) <= 2.
%

category: 'Grail-Tests - Limit Denominator'
method: FractionTestCase
testLimit_denominatorWithMax
	"Test limit_denominator(max_denominator)"

	| fm fracClass f result |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"Pi approximation: 355/113 is close to pi with denominator <= 1000"
	f := fracClass ___new___: fracClass _: 314159265 _: 100000000.
	result := f @env1:limit_denominator: 1000.
	"355/113 is the best approximation with denominator <= 1000"
	self assert: (result @env1:numerator) equals: 355.
	self assert: (result @env1:denominator) equals: 113.
%

category: 'Grail-Tests - Canonical Form & Signs'
method: FractionTestCase
testNegativeFractionEquality
	"Test equality of negative fractions with different sign positions"

	| fm fracClass f1 f2 f3 |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f1 := fracClass ___new___: fracClass _: -1 _: 2.
	f2 := fracClass ___new___: fracClass _: 1 _: -2.
	f3 := fracClass ___new___: fracClass _: -1 _: -2.

	"f1 and f2 should be equal (-1/2 == 1/-2).  Through the OPERATOR: these
	are kernel SmallFractions with no __eq__ of their own, and object's
	default now answers a value MATCH outright but PUNTS on a mismatch (so a
	reflected __eq__ can still run) -- ___cmpEq___: is what resolves the punt
	to False, and is what compiled Python sends."
	self assert: (f1 @env1:___cmpEq___: f2).

	"f3 should NOT equal f1 (1/2 != -1/2)"
	self deny: (f3 @env1:___cmpEq___: f1).
%

category: 'Grail-Tests - Zero and One Argument Forms'
method: FractionTestCase
testOneArgumentFormNegative
	"Test Fraction(-3) returns -3/1"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f := fracClass ___new___: fracClass _: -3.
	self assert: (f @env1:numerator) equals: -3.
	self assert: (f @env1:denominator) equals: 1.
	self assert: (f @env1:__int__) equals: -3.
%

category: 'Grail-Tests - Zero and One Argument Forms'
method: FractionTestCase
testOneArgumentFormNegativeFraction
	"Test Fraction(Fraction(-3, 2)) returns -3/2"

	| fm fracClass f1 f2 |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f1 := fracClass ___new___: fracClass _: -3 _: 2.
	f2 := fracClass ___new___: fracClass _: f1.
	self assert: (f2 @env1:__eq__: f1).
	self assert: (f2 @env1:numerator) equals: -3.
	self assert: (f2 @env1:denominator) equals: 2.
%

category: 'Grail-Tests - Zero and One Argument Forms'
method: FractionTestCase
testOneArgumentFormZero
	"Test Fraction(0) returns 0/1"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f := fracClass ___new___: fracClass _: 0.
	self assert: (f @env1:numerator) equals: 0.
	self assert: (f @env1:denominator) equals: 1.
%

category: 'Grail-Tests - Canonical Form & Signs'
method: FractionTestCase
testSignNormalization
	"Test that sign is always in numerator, denominator always positive per CPython rules"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.

	"Fraction(-1, 2) should have numerator -1, denominator 2"
	f := fracClass ___new___: fracClass _: -1 _: 2.
	self assert: (f @env1:numerator) equals: -1.
	self assert: (f @env1:denominator) equals: 2.

	"Fraction(1, -2) should have numerator -1, denominator 2 (sign moved to numerator)"
	f := fracClass ___new___: fracClass _: 1 _: -2.
	self assert: (f @env1:numerator) equals: -1.
	self assert: (f @env1:denominator) equals: 2.

	"Fraction(-1, -2) should have numerator 1, denominator 2 (both negatives cancel)"
	f := fracClass ___new___: fracClass _: -1 _: -2.
	self assert: (f @env1:numerator) equals: 1.
	self assert: (f @env1:denominator) equals: 2.
%

category: 'Grail-Tests - Zero and One Argument Forms'
method: FractionTestCase
testZeroArgumentForm
	"Test Fraction() returns 0/1"

	| fm fracClass f |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	f := fracClass ___new___: fracClass.
	self assert: (f @env1:numerator) equals: 0.
	self assert: (f @env1:denominator) equals: 1.
	self assert: (f @env1:__int__) equals: 0.
%

category: 'Grail-Tests - Errors'
method: FractionTestCase
testZeroDenominatorRaises
	"Test that Fraction(1, 0) raises ZeroDivisionError"

	| fm fracClass |
	fm := fractions @env1:instance.
	fracClass := fm @env1:Fraction.
	self
		should: [fracClass ___new___: fracClass _: 1 _: 0]
		raise: ZeroDivisionError.
%
