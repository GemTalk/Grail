! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DecimalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DecimalTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DecimalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DecimalTestCase - Tests for Python Decimal type
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
DecimalTestCase removeAllMethods: 0.
DecimalTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testAbsoluteValue
	"Test Decimal absolute value"

	| d result |
	d := (Decimal ___new___: '-42.5').

	result := (d @env1:__abs__).

	self assert: (result @env1:__str__) equals: '42.5'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testStubDecimalArithmetic
	"The ``from decimal import Decimal'' value type (decimal.py) carries an
	EXACT rational, so +/-/*/** are exact (1/3 + 1/3 + 1/3 == 1, not
	0.999...) and .sqrt() is the correctly-rounded double (via exact-rational
	midpoint refinement).  float == Decimal works via float.__eq__'s
	reflection.  math.dist/sumprod/testHypotAccuracy feed Decimals through it.
	(Distinct from the native ScaledDecimal-backed Decimal exercised by the
	other tests here.)  Two Grail landmines shaped the module: the class must
	self-reference via type(self) (the bare ``Decimal'' resolves to
	ScaledDecimal, ___instance___ DNU), and in a module named ``decimal'' a
	method's module-level import/helper mis-resolves (so math is imported
	locally inside sqrt)."

	self assert: (self eval: 'from decimal import Decimal as D
[str(D(3.5) * D(4.5)), D(13) == 13, 13.0 == D(13), float(D(2.5)),
 str(D(1.5) + D(2.5)), 25 * D(4.0) == D(100), type(D(1) + D(2)).__name__,
 D(1)/D(3) + D(1)/D(3) + D(1)/D(3) == D(1), float(D(2).sqrt())]')
		@env1:__repr__
		equals: '[''15.75'', True, True, 2.5, ''4.0'', True, ''Decimal'', True, 1.4142135623730951]'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testAddition
	"Test Decimal addition"

	| d1 d2 result |
	d1 := (Decimal ___new___: '10.5').
	d2 := (Decimal ___new___: '20.3').
	
	result := (d1 @env1:__add__: d2).
	
	self assert: (d1 @env1:__str__) equals: '10.5'.
	self assert: (d2 @env1:__str__) equals: '20.3'.
	self assert: (result @env1:__str__) equals: '30.8'
%

category: 'Grail-Tests - Creation'
method: DecimalTestCase
testCreateFromFloat
	"Test creating Decimal from float"

	| d |
	d := (Decimal ___new___: 3.14).
	
	"Float conversion may not be exact, so just check it's close"
	self assert: ((d @env1:__float__) - 3.14) abs < 0.01
%

category: 'Grail-Tests - Creation'
method: DecimalTestCase
testCreateFromInteger
	"Test creating Decimal from integer"

	| d |
	d := (Decimal ___new___: 42).
	
	self assert: (d @env1:__int__) = 42
%

category: 'Grail-Tests - Creation'
method: DecimalTestCase
testCreateFromString
	"Test creating Decimal from string"

	| d |
	d := (Decimal ___new___: '123.45').
	
	self assert: (d @env1:__str__) equals: '123.45'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testDivision
	"Test Decimal division"

	| d1 d2 result |
	d1 := (Decimal ___new___: '10.0').
	d2 := (Decimal ___new___: '4.0').
	
	result := (d1 @env1:__truediv__: d2).
	
	self assert: (result @env1:__str__) equals: '2.5'
%

category: 'Grail-Tests - Comparison'
method: DecimalTestCase
testEquality
	"Test Decimal equality"

	| d1 d2 d3 |
	d1 := (Decimal ___new___: '42.5').
	d2 := (Decimal ___new___: '42.5').
	d3 := (Decimal ___new___: '42.6').
	
	self assert: (d1 @env1:__eq__: d2).
	self deny: (d1 @env1:__eq__: d3)
%

category: 'Grail-Tests - Comparison'
method: DecimalTestCase
testLessThan
	"Test Decimal less than comparison"

	| d1 d2 |
	d1 := (Decimal ___new___: '10.5').
	d2 := (Decimal ___new___: '20.3').
	
	self assert: (d1 @env1:__lt__: d2).
	self deny: (d2 @env1:__lt__: d1)
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testMultiplication
	"Test Decimal multiplication"

	| d1 d2 result |
	d1 := (Decimal ___new___: '3.5').
	d2 := (Decimal ___new___: '2.0').
	
	result := (d1 @env1:__mul__: d2).
	
	self assert: (result @env1:__str__) equals: '7.0'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testNegation
	"Test Decimal negation"

	| d result |
	d := (Decimal ___new___: '42.5').
	
	result := (d @env1:__neg__).
	
	self assert: (result @env1:__str__) equals: '-42.5'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testSubtraction
	"Test Decimal subtraction"

	| d1 d2 result |
	d1 := (Decimal ___new___: '50.7').
	d2 := (Decimal ___new___: '20.3').
	
	result := (d1 @env1:__sub__: d2).
	
	self assert: (result @env1:__str__) equals: '30.4'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testRoundHalfEven
	"round() on a decimal.Decimal, 1-arg and 2-arg.

	ROUND_HALF_EVEN, matching CPython''s Decimal (round(Decimal(''2.5''))
	is 2, round(Decimal(''3.5'')) is 4).  Note this DIFFERS from Grail''s
	builtin round() on a float, which is half-up -- the Decimal follows
	the decimal module it belongs to, deliberately.

	round(d) answers an int and round(d, n) a Decimal, as in CPython.
	''1.0'' rather than ''1.00'' for round(D(''1.005''), 2) is the module''s
	pre-existing float-routed __str__, not a rounding error: the VALUE
	is exactly 1 (see testFormatFixedPoint for the exact-digit path)."

	self assert: (self eval: 'from decimal import Decimal as D
[round(D("2.5")), round(D("3.5")), round(D("-2.5")), round(D("-3.5")),
 str(round(D("2.675"), 2)), str(round(D("1.005"), 2)),
 str(round(D("12345"), -2)), type(round(D("2.5"))).__name__,
 type(round(D("2.5"), 2)).__name__, round(D("2.5"), None)]')
		@env1:__repr__
		equals: '[2, 4, -2, -4, ''2.68'', ''1.0'', ''12300.0'', ''int'', ''Decimal'', 2]'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testRoundTwoArgWasFatalRegression
	"REGRESSION: round(d, 2) used to kill the process.

	Before decimal.Decimal defined __round__, builtins'' round:_: found
	no __round__ dunder to probe and fell through to its own kernel
	arithmetic, sending an env-0 #* to the PythonInstance.  An env-0
	miss is a raw Smalltalk MessageNotUnderstood (Object.gs''s
	doesNotUnderstand:args:envId: signals it directly when envId is not
	1), so it escaped ``except BaseException'''' and terminated the
	interpreter with ``a Decimal does not understand #*'''' -- which read
	as a broken multiply even though Python-level * was always fine.

	These three expressions are exactly the previously-fatal ones."

	self assert: (self eval: 'from decimal import Decimal as D
[str(round(D("2.675"), 2)), str(round(D("2.5"), 0)),
 format(D("19.99") * 3, ".2f")]')
		@env1:__repr__
		equals: '[''2.68'', ''2.0'', ''59.97'']'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testFormatFixedPoint
	"__format__ for the ''''f'''' presentation type and the empty spec.

	This is the two-decimal-place path the module previously had none
	of: object.__format__ (what a Decimal inherited) rejects every
	non-empty spec, so f''{d:.2f}'' raised TypeError and there is no
	quantize here to fall back on.

	Fixed point rounds half-even, and because it renders the exact
	rational digit by digit rather than going through float() it is the
	only EXACT display path in the module -- note the final case, a
	20-digit integer that __str__ would show as 1.2345678901234567e+19.

	The sixth case, format(D('1.5'), 'f'), asserted '1.500000' when
	this test was written and now asserts '1.5'.  THE ASSERTION WAS
	WRONG, not just the code: 'f' with no precision shows the value's
	own digits.  See testFormatDefaultPrecisionKeepsOwnDigits."

	self assert: (self eval: 'from decimal import Decimal as D
[format(D("1.5"), ".2f"), format(D("19.99") * 3, ".2f"),
 format(D("2.675"), ".2f"), format(D("1.005"), ".2f"),
 format(D("-1.567"), ".2f"), format(D("1.5"), "f"), format(D("1.5"), ""),
 format(D("1.5"), "10.2f"), format(D("1.5"), "08.2f"),
 format(D("1.5"), "<10.2f"), format(D("1.5"), "^10.2f"),
 format(D("1.5"), "*>10.2f"), format(D("1.5"), "+.2f"),
 format(D("1234567.891"), ",.2f"), format(D("12345678901234567890"), ".0f")]')
		@env1:__repr__
		equals: '[''1.50'', ''59.97'', ''2.68'', ''1.00'', ''-1.57'', ''1.5'', ''1.5'', ''      1.50'', ''00001.50'', ''1.50      '', ''   1.50   '', ''******1.50'', ''+1.50'', ''1,234,567.89'', ''12345678901234567890'']'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testFormatRejectsUnsupportedCodes
	"__format__ raises ValueError rather than guessing.

	''''e'''', ''''g'''' and ''''%'''' all need a decimal exponent, and this
	Decimal carries a numerator and a denominator -- no exponent to
	present -- so they are refused instead of approximated.  ''''#'''' is
	not meaningful for a non-integer type, and a bare ''''.'''' with no
	digits is a malformed spec."

	self assert: (self eval: 'from decimal import Decimal as D
out = []
for spec in [".2e", "g", "%", "#.2f", ".f"]:
    try:
        format(D("1.5"), spec)
        out.append("NO-RAISE")
    except ValueError:
        out.append("ValueError")
out')
		@env1:__repr__
		equals: '[''ValueError'', ''ValueError'', ''ValueError'', ''ValueError'', ''ValueError'']'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testTruncatedDivisionAndRemainder
	"// and % TRUNCATE toward zero; the remainder takes the DIVIDEND''s sign.

	That is CPython''s Decimal (the General Decimal Arithmetic
	divide-integer and remainder operations) and it deliberately
	differs from int and float, which floor:
	  Decimal(-7) // Decimal(2) is -3   where  -7 // 2  is -4
	  Decimal(-7) %  Decimal(2) is -1   where  -7 %  2  is  1
	The last element checks the exact identity q*b + r == a, which
	holds for the truncated pair as well as the floored one."

	self assert: (self eval: 'from decimal import Decimal as D
[str(D("7") // D("2")), str(D("7") % D("2")),
 str(D("-7") // D("2")), str(D("-7") % D("2")),
 str(D("7") // D("-2")), str(D("7") % D("-2")),
 str(divmod(D("-7"), D("2"))[0]), str(divmod(D("-7"), D("2"))[1]),
 str(D("7") // 2), str(7 // D("2")), str(7 % D("2")),
 (D("-7") // D("2")) * D("2") + (D("-7") % D("2")) == D("-7"),
 str(D("7.5") % D("2.5")), str(D("1.5") % D("1"))]')
		@env1:__repr__
		equals: '[''3.0'', ''1.0'', ''-3.0'', ''-1.0'', ''-3.0'', ''1.0'', ''-3.0'', ''-1.0'', ''3.0'', ''3.0'', ''1.0'', True, ''0.0'', ''0.5'']'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testDivisionByZeroAndNonCoercibleOperands
	"// % and divmod by zero raise ZeroDivisionError, and a
	non-coercible operand raises TypeError.

	ZeroDivisionError rather than CPython''s DivisionByZero /
	InvalidOperation split: this module has no signal machinery to
	route those through, and __truediv__ here already raises
	ZeroDivisionError, so the two stay consistent.  DivisionByZero in
	this module IS a ZeroDivisionError subclass, so an ``except
	ZeroDivisionError'''' catches either implementation.

	Decimal // Fraction is a TypeError on purpose -- _ratio admits a
	Rational for COMPARISONS only, because mixed Decimal/Fraction
	arithmetic is a TypeError in CPython too (test_fractions''
	testMixingWithDecimal asserts it in both directions)."

	self assert: (self eval: 'from decimal import Decimal as D
import fractions
out = []
try:
    D("7") // D("0")
    out.append("NO-RAISE")
except ZeroDivisionError:
    out.append("ZeroDivisionError")
try:
    D("7") % D("0")
    out.append("NO-RAISE")
except ZeroDivisionError:
    out.append("ZeroDivisionError")
try:
    divmod(D("7"), D("0"))
    out.append("NO-RAISE")
except ZeroDivisionError:
    out.append("ZeroDivisionError")
try:
    7 // D("0")
    out.append("NO-RAISE")
except ZeroDivisionError:
    out.append("ZeroDivisionError")
try:
    D("7") // "a"
    out.append("NO-RAISE")
except TypeError:
    out.append("TypeError")
try:
    D("7") // fractions.Fraction(1, 2)
    out.append("NO-RAISE")
except TypeError:
    out.append("TypeError")
out')
		@env1:__repr__
		equals: '[''ZeroDivisionError'', ''ZeroDivisionError'', ''ZeroDivisionError'', ''ZeroDivisionError'', ''TypeError'', ''TypeError'']'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testScaledDecimalGuardsRaiseTypeError
	"REGRESSION: a non-Number operand used to escape as an uncatchable
	Smalltalk MessageNotUnderstood.

	Every arithmetic dunder in Decimal.gs was a bare ``^ self @env0:OP
	other''.  GemStone's Number generality coercion then sent env-0
	#_generality to the operand; a PythonInstance answers DNU in env 1
	only, so the miss surfaced as MessageNotUnderstood, which no Python
	``except'' can see.  Measured on this image before the guards:
	  a ScaledDecimal times a pure-Python decimal.Decimal
	    -> a Decimal does not understand #_generality
	  a ScaledDecimal times a String
	    -> a Unicode7 does not understand #_generality
	Both are now a catchable Python TypeError via ___binOpFallback___.

	The pure-Python decimal.Decimal is built through self eval: so that
	BOTH Decimal implementations are live in one expression -- mixing
	them (a persisted or Smalltalk ScaledDecimal against a
	decimal.Decimal) is the trigger this guards."
	| sd pyD results |
	sd := Decimal ___new___: '10.5'.
	pyD := self eval: 'from decimal import Decimal
Decimal("2")'.
	results := OrderedCollection new.
	results add: ([ sd @env1:__mul__: pyD. 'NO-RAISE' ]
		on: BaseException do: [:ex | ex class name asString]).
	results add: ([ sd @env1:__add__: pyD. 'NO-RAISE' ]
		on: BaseException do: [:ex | ex class name asString]).
	results add: ([ sd @env1:__sub__: pyD. 'NO-RAISE' ]
		on: BaseException do: [:ex | ex class name asString]).
	results add: ([ sd @env1:__truediv__: pyD. 'NO-RAISE' ]
		on: BaseException do: [:ex | ex class name asString]).
	results add: ([ sd @env1:__floordiv__: pyD. 'NO-RAISE' ]
		on: BaseException do: [:ex | ex class name asString]).
	results add: ([ sd @env1:__mod__: pyD. 'NO-RAISE' ]
		on: BaseException do: [:ex | ex class name asString]).
	results add: ([ sd @env1:__mul__: 'abc'. 'NO-RAISE' ]
		on: BaseException do: [:ex | ex class name asString]).
	self assert: results asArray equals: #('TypeError' 'TypeError' 'TypeError'
		'TypeError' 'TypeError' 'TypeError' 'TypeError')
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testScaledDecimalNumberOperandsStillWork
	"The type guards must not cost the ScaledDecimal happy path: a
	Number operand still takes the direct env-0 send, and an object
	answering __index__ is still accepted (the same two fast paths
	Int.gs and Float.gs keep in front of ___binOpFallback___).

	The exact strings are ScaledDecimal's own scale semantics, not
	anything this change introduces -- 10.5s1 / 2 answers '5.2', not
	'5.25', because the receiver's scale of 1 is carried through the
	division.  Asserted as measured so a later change to those
	semantics is visible here rather than silent."
	| sd |
	sd := Decimal ___new___: '10.5'.
	self assert: (sd @env1:__mul__: 2) @env1:__str__ equals: '21.0'.
	self assert: (sd @env1:__add__: 2) @env1:__str__ equals: '12.5'.
	self assert: (sd @env1:__sub__: 2) @env1:__str__ equals: '8.5'.
	self assert: (sd @env1:__mul__: (Decimal ___new___: '2.0')) @env1:__str__
		equals: '21.0'.
	self assert: (sd @env1:__floordiv__: 2) @env1:__str__ equals: '5'.
	self assert: (sd @env1:__truediv__: 2) @env1:__str__ equals: '5.2'.
	self assert: (sd @env1:__mod__: 2) @env1:__str__ equals: '0.5'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testFormatDefaultPrecisionKeepsOwnDigits
	"REGRESSION: 'f' with no precision defaulted to SIX decimal places.

	format(Decimal('1.5'), 'f') answered '1.500000'; CPython answers
	'1.5'.  Six places is FLOAT's rule -- format(1.5, 'f') really IS
	'1.500000' -- and CPython's Decimal does not follow it: with no
	precision named it shows the value's own digits, i.e. its exponent.
	Taking the float rule for the Decimal rule is how six places got
	baked in, and testFormatFixedPoint above ASSERTED the wrong answer,
	so the bug had a test defending it.  Every case here was measured
	against CPython 3.11.15.

	__init__ builds a literal as (all its digits, 10**places) and never
	reduces, so the denominator still carries the literal's own scale --
	D('1.50') is (150, 100) -- and that k is exactly the exponent a
	CPython Decimal carries.  Hence the trailing zeros below: '1.50' and
	'1.500' come back with their zeros, which __str__ cannot do.

	Two denominators are not powers of ten.  Decimal(0.1) holds the exact
	binary value over 2**55, and its 55-digit expansion here is
	byte-for-byte CPython's -- the exact-expansion fallback.  Decimal(1)
	/ Decimal(3) has no finite expansion at all, a state a CPython
	Decimal can never reach since it cannot hold a third, and keeps the
	six-place fallback."

	self assert: (self eval: 'from decimal import Decimal as D
[format(D("1.5"), "f"), format(D("1.50"), "f"), format(D("1.500"), "f"),
 format(D("100"), "f"), format(D("0.001"), "f"), format(D("19.99") * 3, "f"),
 format(D("-1.5"), "f"), format(D("0"), "f"), format(D("3"), "f"),
 format(D("12345678901234567890"), "f"), format(D("1.5"), "F"),
 format(D("1.50"), "10f"), format(D("-1.50"), "+f"), format(D("1234567.891"), ",f"),
 format(D(0.1), "f"), format(D(1) / D(3), "f"),
 format(D("1.5"), ".6f"), format(D("1.5"), ".0f"), format(D("1.5"), ".2f"),
 format(D("1.5"), ""), format(D("1.5"), "s")]')
		@env1:__repr__
		equals: '[''1.5'', ''1.50'', ''1.500'', ''100'', ''0.001'', ''59.97'', ''-1.5'', ''0'', ''3'', ''12345678901234567890'', ''1.5'', ''      1.50'', ''-1.50'', ''1,234,567.891'', ''0.1000000000000000055511151231257827021181583404541015625'', ''0.333333'', ''1.500000'', ''2'', ''1.50'', ''1.5'', ''1.5'']'
%
