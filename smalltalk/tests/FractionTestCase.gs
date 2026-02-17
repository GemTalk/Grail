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
FractionTestCase category: 'SUnit'
%

! ===============================================================================
! FractionTestCase - Tests for Python fractions.Fraction type
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FractionTestCase removeAllMethods.
FractionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - Rounding'
method: FractionTestCase
test__ceil__
	"Test __ceil__ returns smallest integer >= self"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"ceil(3/2) = 2"
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f perform: #__ceil__ env: 2) equals: 2.

	"ceil(5/1) = 5"
	f := fracClass ___new___: fracClass _: 5 _: 1.
	self assert: (f perform: #__ceil__ env: 2) equals: 5.

	"ceil(-3/2) = -1 (ceil goes toward positive infinity)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f perform: #__ceil__ env: 2) equals: -1.

	"ceil(-5/1) = -5"
	f := fracClass ___new___: fracClass _: -5 _: 1.
	self assert: (f perform: #__ceil__ env: 2) equals: -5.
%

category: 'Tests - Rounding'
method: FractionTestCase
test__floor__
	"Test __floor__ returns largest integer <= self"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"floor(3/2) = 1"
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f perform: #__floor__ env: 2) equals: 1.

	"floor(5/1) = 5"
	f := fracClass ___new___: fracClass _: 5 _: 1.
	self assert: (f perform: #__floor__ env: 2) equals: 5.

	"floor(-3/2) = -2 (floor goes toward negative infinity)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f perform: #__floor__ env: 2) equals: -2.

	"floor(-5/1) = -5"
	f := fracClass ___new___: fracClass _: -5 _: 1.
	self assert: (f perform: #__floor__ env: 2) equals: -5.
%

category: 'Tests - Format'
method: FractionTestCase
test__format__Empty
	"Test __format__('') returns str(self)"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f perform: #__format__: env: 2 withArguments: {''}.
	self assert: result equals: '3/2'.
%

category: 'Tests - Format'
method: FractionTestCase
test__format__Nil
	"Test __format__(nil) returns str(self)"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f perform: #__format__: env: 2 withArguments: {nil}.
	self assert: result equals: '3/2'.
%

category: 'Tests - Hash'
method: FractionTestCase
test__hash__
	"Test __hash__ returns an integer"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f perform: #__hash__ env: 2.
	self assert: (result isKindOf: Integer).
%

category: 'Tests - Repr'
method: FractionTestCase
test__repr__
	"Test repr(Fraction) format matches CPython: 'Fraction(n, d)'"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f perform: #__repr__ env: 2.
	self assert: result equals: 'Fraction(3, 2)'.

	f := fracClass ___new___: fracClass _: -1 _: 2.
	result := f perform: #__repr__ env: 2.
	self assert: result equals: 'Fraction(-1, 2)'.

	"Note: Fraction(0, 1) in GemStone becomes SmallInteger 0, not a Fraction
	 because GemStone canonicalizes fractions equivalent to integers"
%

category: 'Tests - Rounding'
method: FractionTestCase
test__round__
	"Test __round__ rounds to nearest integer, ties to even"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"round(3/2) = 2 (1.5 rounds to 2, the even number)"
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f perform: #__round__ env: 2) equals: 2.

	"round(5/2) = 2 (2.5 rounds to 2, the even number)"
	f := fracClass ___new___: fracClass _: 5 _: 2.
	self assert: (f perform: #__round__ env: 2) equals: 2.

	"round(7/2) = 4 (3.5 rounds to 4, the even number)"
	f := fracClass ___new___: fracClass _: 7 _: 2.
	self assert: (f perform: #__round__ env: 2) equals: 4.

	"round(7/4) = 2 (1.75 rounds to 2)"
	f := fracClass ___new___: fracClass _: 7 _: 4.
	self assert: (f perform: #__round__ env: 2) equals: 2.

	"round(-3/2) = -2 (-1.5 rounds to -2, the even number)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f perform: #__round__ env: 2) equals: -2.
%

category: 'Tests - Rounding'
method: FractionTestCase
test__round__WithNdigits
	"Test __round__(ndigits)"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"round(7/4, 1) should give Fraction close to 1.8"
	f := fracClass ___new___: fracClass _: 7 _: 4.
	result := f perform: #__round__: env: 2 withArguments: {1}.
	"Result should be 9/5 = 1.8"
	self assert: ((result perform: #__float__ env: 2) - 1.8) abs < 0.0001.

	"round with ndigits=0 returns integer"
	f := fracClass ___new___: fracClass _: 7 _: 4.
	result := f perform: #__round__: env: 2 withArguments: {0}.
	self assert: (result isKindOf: Integer).
	self assert: result equals: 2.
%

category: 'Tests - Fraction Methods'
method: FractionTestCase
testAs_integer_ratio
	"Test as_integer_ratio returns (numerator, denominator) tuple"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	f := fracClass ___new___: fracClass _: 3 _: 2.
	result := f perform: #as_integer_ratio env: 2.
	"Use 0-based Python indexing"
	self assert: (result perform: #__getitem__: env: 2 withArguments: {0}) equals: 3.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {1}) equals: 2.

	f := fracClass ___new___: fracClass _: -5 _: 4.
	result := f perform: #as_integer_ratio env: 2.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {0}) equals: -5.
	self assert: (result perform: #__getitem__: env: 2 withArguments: {1}) equals: 4.
%

category: 'Tests - Negative Conversion'
method: FractionTestCase
testBoolNegative
	"Test __bool__ for negative fractions (any non-zero is True)"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f perform: #__bool__ env: 2).

	f := fracClass ___new___: fracClass _: -1 _: 1.
	self assert: (f perform: #__bool__ env: 2).
%

category: 'Tests - Canonical Form & Signs'
method: FractionTestCase
testCanonicalFormEquality
	"Test that equivalent fractions are equal (e.g., 1/2 == 2/4)"

	| fm fracClass f1 f2 |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f1 := fracClass ___new___: fracClass _: 1 _: 2.
	f2 := fracClass ___new___: fracClass _: 2 _: 4.
	self assert: (f1 perform: #__eq__: env: 2 withArguments: {f2}).
	"After reduction, both should have same numerator/denominator"
	self assert: (f1 perform: #numerator env: 2) equals: (f2 perform: #numerator env: 2).
	self assert: (f1 perform: #denominator env: 2) equals: (f2 perform: #denominator env: 2).
%

category: 'Tests - Conversion'
method: FractionTestCase
testConversionsAndBool
	"Test __int__, __float__ and __bool__ on Fraction"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f := fracClass ___new___: fracClass _: 3 _: 2.
	self assert: (f perform: #__int__ env: 2) equals: 1.
	self assert: ((f perform: #__float__ env: 2) - 1.5) abs < 0.0001.
	self assert: (f perform: #__bool__ env: 2).
	f := fracClass ___new___: fracClass _: 0 _: 1.
	self deny: (f perform: #__bool__ env: 2).
%

category: 'Tests - Creation'
method: FractionTestCase
testCreateFromFraction
	"Test Fraction(Fraction(1, 3)) returns an equivalent fraction"

	| fm fracClass f1 f2 |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f1 := fracClass ___new___: fracClass _: 1 _: 3.
	f2 := fracClass ___new___: fracClass _: f1.
	self assert: (f2 perform: #__eq__: env: 2 withArguments: {f1}).
%

category: 'Tests - Creation'
method: FractionTestCase
testCreateFromIntegers
	"Test Fraction(1, 2) construction"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f := fracClass ___new___: fracClass _: 1 _: 2.
	self assert: (f perform: #numerator env: 2) equals: 1.
	self assert: (f perform: #denominator env: 2) equals: 2.
	self assert: (f perform: #__str__ env: 2) equals: '1/2'.
%

category: 'Tests - Creation'
method: FractionTestCase
testCreateFromSingleInteger
	"Test Fraction(3) construction"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f := fracClass ___new___: fracClass _: 3.
	self assert: (f perform: #__int__ env: 2) equals: 3.
	self assert: (f perform: #__float__ env: 2) equals: 3.0.
%

category: 'Tests - Negative Conversion'
method: FractionTestCase
testFloatNegative
	"Test __float__ for negative fractions"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: ((f perform: #__float__ env: 2) - -1.5) abs < 0.0001.

	f := fracClass ___new___: fracClass _: -1 _: 4.
	self assert: ((f perform: #__float__ env: 2) - -0.25) abs < 0.0001.
%

category: 'Tests - Module Binding'
method: FractionTestCase
testFractionsModuleProvidesFraction
	"Test that fractions module exposes the Fraction type"

	| fm fracClass |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	self assert: fracClass equals: Fraction.
%

category: 'Tests - Class Methods'
method: FractionTestCase
testFrom_decimal
	"Test Fraction.from_decimal() class method"

	| fm fracClass dec f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"Create a Decimal (ScaledDecimal) with value 0.5"
	dec := Decimal perform: #for:scale: env: 0 withArguments: {0.5. 2}.
	f := fracClass perform: #from_decimal: env: 2 withArguments: {dec}.
	self assert: ((f perform: #__float__ env: 2) - 0.5) abs < 0.0001.
%

category: 'Tests - Class Methods'
method: FractionTestCase
testFrom_float
	"Test Fraction.from_float() class method"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"0.5 should give 1/2"
	f := fracClass perform: #from_float: env: 2 withArguments: {0.5}.
	self assert: (f perform: #numerator env: 2) equals: 1.
	self assert: (f perform: #denominator env: 2) equals: 2.

	"Integer argument should work"
	f := fracClass perform: #from_float: env: 2 withArguments: {5}.
	self assert: (f perform: #numerator env: 2) equals: 5.
	self assert: (f perform: #denominator env: 2) equals: 1.

	"Negative float"
	f := fracClass perform: #from_float: env: 2 withArguments: {-0.25}.
	self assert: (f perform: #numerator env: 2) equals: -1.
	self assert: (f perform: #denominator env: 2) equals: 4.
%

category: 'Tests - Class Methods'
method: FractionTestCase
testFrom_floatRaisesOnInfinity
	"Test Fraction.from_float() raises on Infinity"

	| fm fracClass inf |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	inf := 1.0 / 0.0.  "Create Infinity"
	self
		should: [fracClass perform: #from_float: env: 2 withArguments: {inf}]
		raise: ValueError.
%

category: 'Tests - Class Methods'
method: FractionTestCase
testFrom_floatRaisesOnNaN
	"Test Fraction.from_float() raises on NaN"

	| fm fracClass nan |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	nan := 0.0 / 0.0.  "Create NaN"
	self
		should: [fracClass perform: #from_float: env: 2 withArguments: {nan}]
		raise: ValueError.
%

category: 'Tests - Class Methods'
method: FractionTestCase
testFrom_number
	"Test Fraction.from_number() class method with objects having as_integer_ratio"

	| fm fracClass f origFrac |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"Float has as_integer_ratio"
	f := fracClass perform: #from_number: env: 2 withArguments: {0.5}.
	self assert: (f perform: #numerator env: 2) equals: 1.
	self assert: (f perform: #denominator env: 2) equals: 2.

	"Fraction has as_integer_ratio"
	origFrac := fracClass ___new___: fracClass _: 3 _: 4.
	f := fracClass perform: #from_number: env: 2 withArguments: {origFrac}.
	self assert: (f perform: #__eq__: env: 2 withArguments: {origFrac}).
%

category: 'Tests - Hash'
method: FractionTestCase
testHashEqualityConsistency
	"Test that equal fractions have equal hashes"

	| fm fracClass f1 f2 f3 h1 h2 h3 |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"1/2 and 2/4 are equal, so their hashes must match"
	f1 := fracClass ___new___: fracClass _: 1 _: 2.
	f2 := fracClass ___new___: fracClass _: 2 _: 4.
	h1 := f1 perform: #__hash__ env: 2.
	h2 := f2 perform: #__hash__ env: 2.
	self assert: h1 equals: h2.

	"-1/2 and 1/-2 are equal, so their hashes must match"
	f1 := fracClass ___new___: fracClass _: -1 _: 2.
	f3 := fracClass ___new___: fracClass _: 1 _: -2.
	h1 := f1 perform: #__hash__ env: 2.
	h3 := f3 perform: #__hash__ env: 2.
	self assert: h1 equals: h3.
%

category: 'Tests - Negative Conversion'
method: FractionTestCase
testIntTruncationTowardZeroNegative
	"Test __int__ truncates toward zero for negative fractions (CPython behavior)"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"int(-3/2) should be -1, not -2 (truncation toward zero)"
	f := fracClass ___new___: fracClass _: -3 _: 2.
	self assert: (f perform: #__int__ env: 2) equals: -1.

	"int(-7/4) should be -1"
	f := fracClass ___new___: fracClass _: -7 _: 4.
	self assert: (f perform: #__int__ env: 2) equals: -1.

	"int(-5/5) should be -1"
	f := fracClass ___new___: fracClass _: -5 _: 5.
	self assert: (f perform: #__int__ env: 2) equals: -1.
%

category: 'Tests - Fraction Methods'
method: FractionTestCase
testIs_integer
	"Test is_integer returns True when denominator is 1"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	f := fracClass ___new___: fracClass _: 5 _: 1.
	self assert: (f perform: #is_integer env: 2).

	f := fracClass ___new___: fracClass _: -3 _: 1.
	self assert: (f perform: #is_integer env: 2).

	f := fracClass ___new___: fracClass _: 3 _: 2.
	self deny: (f perform: #is_integer env: 2).

	f := fracClass ___new___: fracClass _: 6 _: 3.
	"After reduction, 6/3 = 2/1, so is_integer should be true"
	self assert: (f perform: #is_integer env: 2).
%

category: 'Tests - Limit Denominator'
method: FractionTestCase
testLimit_denominatorDefault
	"Test limit_denominator() with default max (10**6)"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"Fraction with denominator within limit stays the same"
	f := fracClass ___new___: fracClass _: 1 _: 3.
	result := f perform: #limit_denominator env: 2.
	self assert: (result perform: #__eq__: env: 2 withArguments: {f}).
%

category: 'Tests - Limit Denominator'
method: FractionTestCase
testLimit_denominatorSmall
	"Test limit_denominator with small max values"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"1/3 with max_denominator=2 should give 1/2 (closest with d <= 2)"
	f := fracClass ___new___: fracClass _: 1 _: 3.
	result := f perform: #limit_denominator: env: 2 withArguments: {2}.
	self assert: (result perform: #denominator env: 2) <= 2.
%

category: 'Tests - Limit Denominator'
method: FractionTestCase
testLimit_denominatorWithMax
	"Test limit_denominator(max_denominator)"

	| fm fracClass f result |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"Pi approximation: 355/113 is close to pi with denominator <= 1000"
	f := fracClass ___new___: fracClass _: 314159265 _: 100000000.
	result := f perform: #limit_denominator: env: 2 withArguments: {1000}.
	"355/113 is the best approximation with denominator <= 1000"
	self assert: (result perform: #numerator env: 2) equals: 355.
	self assert: (result perform: #denominator env: 2) equals: 113.
%

category: 'Tests - Canonical Form & Signs'
method: FractionTestCase
testNegativeFractionEquality
	"Test equality of negative fractions with different sign positions"

	| fm fracClass f1 f2 f3 |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f1 := fracClass ___new___: fracClass _: -1 _: 2.
	f2 := fracClass ___new___: fracClass _: 1 _: -2.
	f3 := fracClass ___new___: fracClass _: -1 _: -2.

	"f1 and f2 should be equal (-1/2 == 1/-2)"
	self assert: (f1 perform: #__eq__: env: 2 withArguments: {f2}).

	"f3 should NOT equal f1 (1/2 != -1/2)"
	self deny: (f3 perform: #__eq__: env: 2 withArguments: {f1}).
%

category: 'Tests - Zero and One Argument Forms'
method: FractionTestCase
testOneArgumentFormNegative
	"Test Fraction(-3) returns -3/1"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f := fracClass ___new___: fracClass _: -3.
	self assert: (f perform: #numerator env: 2) equals: -3.
	self assert: (f perform: #denominator env: 2) equals: 1.
	self assert: (f perform: #__int__ env: 2) equals: -3.
%

category: 'Tests - Zero and One Argument Forms'
method: FractionTestCase
testOneArgumentFormNegativeFraction
	"Test Fraction(Fraction(-3, 2)) returns -3/2"

	| fm fracClass f1 f2 |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f1 := fracClass ___new___: fracClass _: -3 _: 2.
	f2 := fracClass ___new___: fracClass _: f1.
	self assert: (f2 perform: #__eq__: env: 2 withArguments: {f1}).
	self assert: (f2 perform: #numerator env: 2) equals: -3.
	self assert: (f2 perform: #denominator env: 2) equals: 2.
%

category: 'Tests - Zero and One Argument Forms'
method: FractionTestCase
testOneArgumentFormZero
	"Test Fraction(0) returns 0/1"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f := fracClass ___new___: fracClass _: 0.
	self assert: (f perform: #numerator env: 2) equals: 0.
	self assert: (f perform: #denominator env: 2) equals: 1.
%

category: 'Tests - Canonical Form & Signs'
method: FractionTestCase
testSignNormalization
	"Test that sign is always in numerator, denominator always positive per CPython rules"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.

	"Fraction(-1, 2) should have numerator -1, denominator 2"
	f := fracClass ___new___: fracClass _: -1 _: 2.
	self assert: (f perform: #numerator env: 2) equals: -1.
	self assert: (f perform: #denominator env: 2) equals: 2.

	"Fraction(1, -2) should have numerator -1, denominator 2 (sign moved to numerator)"
	f := fracClass ___new___: fracClass _: 1 _: -2.
	self assert: (f perform: #numerator env: 2) equals: -1.
	self assert: (f perform: #denominator env: 2) equals: 2.

	"Fraction(-1, -2) should have numerator 1, denominator 2 (both negatives cancel)"
	f := fracClass ___new___: fracClass _: -1 _: -2.
	self assert: (f perform: #numerator env: 2) equals: 1.
	self assert: (f perform: #denominator env: 2) equals: 2.
%

category: 'Tests - Zero and One Argument Forms'
method: FractionTestCase
testZeroArgumentForm
	"Test Fraction() returns 0/1"

	| fm fracClass f |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	f := fracClass ___new___: fracClass.
	self assert: (f perform: #numerator env: 2) equals: 0.
	self assert: (f perform: #denominator env: 2) equals: 1.
	self assert: (f perform: #__int__ env: 2) equals: 0.
%

category: 'Tests - Errors'
method: FractionTestCase
testZeroDenominatorRaises
	"Test that Fraction(1, 0) raises ZeroDivisionError"

	| fm fracClass |
	fm := fractions perform: #instance env: 2.
	fracClass := fm perform: #Fraction env: 2.
	self
		should: [fracClass ___new___: fracClass _: 1 _: 0]
		raise: ZeroDivisionError.
%
