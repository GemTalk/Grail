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
	"Test Decimal multiplication.

	'7.00', not '7.0'.  UPDATED with the exact __mul__:: CPython's rule is
	that the exponents ADD, so scale 1 times scale 1 answers scale 2 and
	Decimal('3.5') * Decimal('2.0') is Decimal('7.00') -- verified against
	CPython 3.14.  The old '7.0' was ScaledDecimal's max(scale) rounding,
	and the assertion could not be kept without keeping the divergence it
	pinned."

	| d1 d2 result |
	d1 := (Decimal ___new___: '3.5').
	d2 := (Decimal ___new___: '2.0').
	
	result := (d1 @env1:__mul__: d2).
	
	self assert: (result @env1:__str__) equals: '7.00'
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
	20-digit integer that __str__ would show as 1.2345678901234567e+19."

	self assert: (self eval: 'from decimal import Decimal as D
[format(D("1.5"), ".2f"), format(D("19.99") * 3, ".2f"),
 format(D("2.675"), ".2f"), format(D("1.005"), ".2f"),
 format(D("-1.567"), ".2f"), format(D("1.5"), "f"), format(D("1.5"), ""),
 format(D("1.5"), "10.2f"), format(D("1.5"), "08.2f"),
 format(D("1.5"), "<10.2f"), format(D("1.5"), "^10.2f"),
 format(D("1.5"), "*>10.2f"), format(D("1.5"), "+.2f"),
 format(D("1234567.891"), ",.2f"), format(D("12345678901234567890"), ".0f")]')
		@env1:__repr__
		equals: '[''1.50'', ''59.97'', ''2.68'', ''1.00'', ''-1.57'', ''1.500000'', ''1.5'', ''      1.50'', ''00001.50'', ''1.50      '', ''   1.50   '', ''******1.50'', ''+1.50'', ''1,234,567.89'', ''12345678901234567890'']'
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

	THE PROMISE THIS TEST MADE HAS NOW BEEN CALLED IN.  It used to assert
	'5.2' for 10.5 / 2 and '21.0' for 10.5 * 2.0 -- ScaledDecimal's
	max(scale) rounding -- and said in as many words that it asserted them
	as MEASURED ''so a later change to those semantics is visible here
	rather than silent''.  This is that change, and these are the three
	assertions it moved, each to CPython 3.14's own answer:
	  10.5  / 2            '5.2'  -> '5.25'   (context precision, not max scale)
	  10.5  * Decimal 2.0  '21.0' -> '21.00'  (exponents add)
	Everything else is untouched, and an INT operand is deliberately
	included throughout: an int has scale 0, so int arithmetic gives the
	same answer under either rule and is the part of the happy path the
	type guards must not cost."
	| sd |
	sd := Decimal ___new___: '10.5'.
	self assert: (sd @env1:__mul__: 2) @env1:__str__ equals: '21.0'.
	self assert: (sd @env1:__add__: 2) @env1:__str__ equals: '12.5'.
	self assert: (sd @env1:__sub__: 2) @env1:__str__ equals: '8.5'.
	self assert: (sd @env1:__mul__: (Decimal ___new___: '2.0')) @env1:__str__
		equals: '21.00'.
	self assert: (sd @env1:__floordiv__: 2) @env1:__str__ equals: '5'.
	self assert: (sd @env1:__truediv__: 2) @env1:__str__ equals: '5.25'.
	self assert: (sd @env1:__mod__: 2) @env1:__str__ equals: '0.5'
%

! ===============================================================================
! ScaledDecimal storage-level conformance (issue #846)
! ===============================================================================
! Everything below exercises the NATIVE, ScaledDecimal-backed Decimal -- the one
! a bare ``Decimal(...)'' call resolves to -- not the pure-Python decimal.py
! class the 'Stub module' tests above cover.  The two are still separate objects
! at this commit; consolidating them is deliberately a later step.
!
! ``self eval:'' is used where the point is that the PYTHON path produces the
! answer, and a direct @env1: send where the point is the storage itself.  Note
! that ``self eval:'' must NOT import decimal in these tests: that would bind
! the other implementation and measure the wrong class.

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testStrRendersCoefficientAndExponentExactly
	"__str__ is CPython's to-scientific-string, built from the mantissa and
	the scale.

	Three things it fixes, each of which the previous ``self asString''
	route got wrong:
	  * scale 0 printed a TRAILING POINT -- '100.' where CPython says '100'.
	  * trailing zeros survive, which is the entire reason this backing
	    class can serve decimal.Decimal at all: 1.50 and 1.5 are the same
	    RATIONAL and different DECIMALS.
	  * CPython switches to exponent notation when adjusted < -6, which no
	    fixed-point rendering can produce.  1e-7 is the first value past
	    that boundary and 0.000001 the last one before it -- both are here
	    on purpose."

	self assert: (self eval: '[str(Decimal("1.50")), repr(Decimal("1.50")),
 str(Decimal("100")), str(Decimal("0.5")), str(Decimal("0.00")),
 str(Decimal("-1.50")), str(Decimal("0.000001")), str(Decimal("1e-7")),
 str(Decimal("-1e-7")), str(Decimal(0))]')
		@env1:__repr__
		equals: '[''1.50'', "Decimal(''1.50'')", ''100'', ''0.5'', ''0.00'', ''-1.50'', ''0.000001'', ''1E-7'', ''-1E-7'', ''0'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testTypeNameIsDecimalForBothBackingClasses
	"``type(d).__name__'' answers 'Decimal', not 'SmallScaledDecimal'.

	REGRESSION.  Measured before the __class__ override: it answered
	'SmallScaledDecimal'.  Object.gs's type-name table lists only
	'ScaledDecimal', while every literal and every constructed value is a
	SmallScaledDecimal until it outgrows the special encoding -- so the
	kernel spelling leaked into every type name and repr, and
	``type(d) is Decimal'' was false.

	Fixed WITHOUT touching Object.gs: type() asks __class__ (object >>
	___pyMetaclass___ routes a non-class receiver through it), which is the
	same hook the integer, float and dict-view families use to normalise
	their several backing classes onto one Python type.  The large value is
	included because it is a genuinely different Smalltalk class."

	self assert: (self eval: '[type(Decimal("1.50")).__name__,
 type(Decimal("1e-40") * Decimal("1e-40")).__name__,
 type(Decimal(42)).__name__]')
		@env1:__repr__
		equals: '[''Decimal'', ''Decimal'', ''Decimal'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testConstructionFromExponentNotation
	"Exponent notation now CONSTRUCTS.

	REGRESSION: ``Decimal('1E+5')'' used to die with ``illegal trailing
	digit'' -- ScaledDecimal fromString: does not accept an exponent -- and
	the death was an uncatchable Smalltalk error, for a value the storage
	can hold perfectly well.  Parsing the literal here instead of handing it
	to fromString: fixes that.

	'1E+5' answers '100000' rather than CPython's '1E+5' because scale >= 0
	is enforced, so a POSITIVE exponent has no representation and is
	multiplied out into the coefficient: the value is exact, the exponent
	identity is not.  That is the documented limit, asserted so it stays
	visible.  PEP 515 underscores are accepted, as CPython accepts them."

	self assert: (self eval: '[str(Decimal("1E+5")), str(Decimal("5e3")),
 str(Decimal("1.5e3")), str(Decimal("1.5e-3")), str(Decimal("-2.5E-4")),
 str(Decimal("1_000.5")), str(Decimal("  1.25  ")), str(Decimal("+1.25")),
 str(Decimal(".5")), str(Decimal("5."))]')
		@env1:__repr__
		equals: '[''100000'', ''5000'', ''1500'', ''0.0015'', ''-0.00025'', ''1000.5'', ''1.25'', ''1.25'', ''0.5'', ''5'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testConstructionFromFloatIsExact
	"Decimal(float) captures the double's EXACT value, as CPython's does.

	It used to be ``for: value scale: 28'', which is inexact and answered a
	28-place approximation.  A finite double is m/2^k, and m/2^k =
	(m*5^k)/10^k is always a terminating decimal, so exactness costs
	nothing here.  Decimal(0.1) is the full 55-digit expansion -- the same
	string CPython prints -- and an integral float answers no fraction
	digits at all."

	self assert: (self eval: '[str(Decimal(0.1)), str(Decimal(3.5)),
 str(Decimal(4.0)), str(Decimal(0.5)), Decimal(0.1) == Decimal(0.1),
 float(Decimal(0.1)) == 0.1]')
		@env1:__repr__
		equals: '[''0.1000000000000000055511151231257827021181583404541015625'', ''3.5'', ''4'', ''0.5'', True, True]'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testExactMultiplicationAddsExponents
	"__mul__: is EXACT: coefficients multiply, exponents ADD.

	ScaledDecimal's own #* rounds the product to max(scale), which CPython
	does not.  Measured on this image before the change:
	  3.10s2 * 1.005s3 -> 3.116     CPython: 3.11550
	  1.50s2 * 1.50s2  -> rounded   CPython: 2.2500
	so this does its own coefficient arithmetic rather than delegating.

	The int cases are here to show the guard costs the happy path nothing:
	an int has scale 0, so the two rules agree for it and 10.5 * 2 is
	'21.0' either way."

	self assert: (self eval: '[str(Decimal("3.10") * Decimal("1.005")),
 str(Decimal("1.50") * Decimal("1.50")), str(Decimal("0.1") * Decimal("0.1")),
 str(Decimal("3.5") * Decimal("2.0")), str(Decimal("10.5") * 2),
 str(Decimal("-1.5") * Decimal("2.00")), str(Decimal("0") * Decimal("1.50"))]')
		@env1:__repr__
		equals: '[''3.11550'', ''2.2500'', ''0.01'', ''7.00'', ''21.0'', ''-3.000'', ''0.00'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testDivisionHonoursContextPrecision
	"__truediv__: rounds to the CONTEXT PRECISION, not to max(scale).

	ScaledDecimal's #/ rounds to max(scale) -- measured: 1.00s2 / 3.00s2
	answered 0.33 -- which makes a quotient's accuracy depend on how its
	operands happened to be SPELLED.  This is CPython's divide instead:
	exact when the division terminates (10.0/4.0 is 2.5, not 2.5000...),
	otherwise `prec` significant digits.

	The precision itself lives in SessionTemps, because ScaledDecimal is a
	kernel class with nowhere to put it; ___setPrecision___: is the one seam
	a Python-level Context drives it through, and this test drives it
	directly.  Restored in an #ensure: block so a failure cannot leak a
	changed precision into the rest of the shard."

	| a b |
	a := Decimal ___new___: '1.00'.
	b := Decimal ___new___: '3.00'.
	self assert: (a @env1:__truediv__: b) @env1:__str__
		equals: '0.3333333333333333333333333333'.
	self assert: ((Decimal ___new___: '10.0') @env1:__truediv__:
		(Decimal ___new___: '4.0')) @env1:__str__ equals: '2.5'.
	self assert: ((Decimal ___new___: '10.5') @env1:__truediv__: 2)
		@env1:__str__ equals: '5.25'.
	self assert: ((Decimal ___new___: '1') @env1:__truediv__:
		(Decimal ___new___: '7')) @env1:__str__
		equals: '0.1428571428571428571428571429'.
	[Decimal @env1:___setPrecision___: 5.
	 self assert: (a @env1:__truediv__: b) @env1:__str__ equals: '0.33333'.
	 Decimal @env1:___setPrecision___: 9.
	 self assert: (a @env1:__truediv__: b) @env1:__str__ equals: '0.333333333']
		ensure: [Decimal @env1:___setPrecision___: 28]
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testIntegerPowerIsExact
	"__pow__: for an integer exponent is exact.

	ScaledDecimal's #raisedTo: rounds to the receiver's own scale --
	measured: 1.5s1 raisedTo: 2 answered 2.2 where CPython answers 2.25 --
	so the coefficient is raised and the scale multiplied here instead.

	A NEGATIVE exponent goes through the precision-honouring divide, and a
	FRACTIONAL one is refused with a TypeError rather than approximated:
	it needs a general power this storage cannot give exactly, and a quietly
	rounded answer would be worse than an error."

	self assert: (self eval: '[str(Decimal("1.5") ** 2), str(Decimal("1.5") ** 0),
 str(Decimal("1.5") ** 1), str(Decimal("0.1") ** 3), str(Decimal("2") ** -1),
 str(Decimal("2") ** -2), str(Decimal("-1.5") ** 3), str(Decimal("10") ** 3)]')
		@env1:__repr__
		equals: '[''2.25'', ''1'', ''1.5'', ''0.001'', ''0.5'', ''0.25'', ''-3.375'', ''1000'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testQuantize
	"quantize() rescales to another Decimal's exponent.

	This is the fixed-decimal-places operation the class had none of, and
	it never goes near a float.  Scaling UP is exact (1.5 to three places
	is '1.500'); scaling DOWN rounds, half-even by default, so 2.675 to two
	places is '2.68' -- the answer the exact decimal has, and the one a
	float route cannot give."

	self assert: (self eval: '[str(Decimal("3.11550").quantize(Decimal("0.01"))),
 str(Decimal("2.675").quantize(Decimal("0.01"))),
 str(Decimal("1.5").quantize(Decimal("0.001"))),
 str(Decimal("-1.567").quantize(Decimal("0.01"))),
 str(Decimal("1.005").quantize(Decimal("0.01"))),
 str(Decimal("12345").quantize(Decimal("1"))),
 str(Decimal("2.5").quantize(Decimal("1"))),
 str(Decimal("3.5").quantize(Decimal("1")))]')
		@env1:__repr__
		equals: '[''3.12'', ''2.68'', ''1.500'', ''-1.57'', ''1.00'', ''12345'', ''2'', ''4'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testQuantizeRoundingModes
	"quantize() honours an explicit ROUND_* mode, and rejects a bogus one.

	All eight modes are exercised on the same value so the differences are
	the point rather than the arithmetic.  CEILING and FLOOR are
	sign-sensitive, which is why the rounding helper carries the sign
	separately from the magnitude it divides."

	self assert: (self eval: '[str(Decimal("1.001").quantize(Decimal("0.01"), "ROUND_UP")),
 str(Decimal("1.009").quantize(Decimal("0.01"), "ROUND_DOWN")),
 str(Decimal("1.005").quantize(Decimal("0.01"), "ROUND_HALF_UP")),
 str(Decimal("1.005").quantize(Decimal("0.01"), "ROUND_HALF_DOWN")),
 str(Decimal("1.005").quantize(Decimal("0.01"), "ROUND_HALF_EVEN")),
 str(Decimal("1.001").quantize(Decimal("0.01"), "ROUND_CEILING")),
 str(Decimal("1.009").quantize(Decimal("0.01"), "ROUND_FLOOR")),
 str(Decimal("-1.001").quantize(Decimal("0.01"), "ROUND_CEILING")),
 str(Decimal("-1.001").quantize(Decimal("0.01"), "ROUND_FLOOR"))]')
		@env1:__repr__
		equals: '[''1.01'', ''1.00'', ''1.01'', ''1.00'', ''1.00'', ''1.01'', ''1.00'', ''-1.00'', ''-1.01'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testAsTupleAdjustedAndNormalize
	"as_tuple(), adjusted() and normalize() -- pure coefficient/exponent
	arithmetic, and the introspection a caller needs to see that the
	trailing zeros are really there.

	as_tuple answers a plain tuple; CPython's DecimalTuple is a namedtuple,
	which compares equal to one.  normalize STOPS at scale 0, because going
	further needs a positive exponent this storage cannot hold -- CPython's
	Decimal('100').normalize() is Decimal('1E+2') and this answers
	Decimal('100'), the same value.  Asserted as the documented limit."

	self assert: (self eval: '[Decimal("1.50").as_tuple(), Decimal("-0.5").as_tuple(),
 Decimal("0").as_tuple(), Decimal("123").as_tuple(),
 Decimal("0.000001").adjusted(), Decimal("123.45").adjusted(),
 Decimal("1.50").adjusted(), Decimal("0.00").adjusted(),
 str(Decimal("1.50").normalize()), str(Decimal("1.000").normalize()),
 str(Decimal("100").normalize()), str(Decimal("0.00").normalize())]')
		@env1:__repr__
		equals: '[(0, (1, 5, 0), -2), (1, (5,), -1), (0, (0,), 0), (0, (1, 2, 3), 0), -6, 2, 0, -2, ''1.5'', ''1'', ''100'', ''0'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testAsIntegerRatioIsExact
	"as_integer_ratio() is exact by construction: the value IS
	mantissa/10^scale, so only the gcd has to be divided out.
	``Fraction(d)'' and ``Fraction.from_decimal(d)'' consume this."

	self assert: (self eval: '[Decimal("0.5").as_integer_ratio(),
 Decimal("1.50").as_integer_ratio(), Decimal("-0.25").as_integer_ratio(),
 Decimal("0").as_integer_ratio(), Decimal("123").as_integer_ratio(),
 Decimal(0.1).as_integer_ratio() == (0.1).as_integer_ratio()]')
		@env1:__repr__
		equals: '[(1, 2), (3, 2), (-1, 4), (0, 1), (123, 1), True]'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testSpecialValuePredicates
	"is_nan / is_snan / is_qnan / is_infinite / is_finite / is_zero /
	is_signed.

	Every one of the first five answers a CONSTANT, and that is the honest
	answer rather than a stub: this storage has no NaN and no Infinity
	encoding, so a Decimal that exists here is finite by construction --
	constructing anything else raises (see the next test).  They exist so
	that code written against CPython's decimal can ASK the question and get
	an answer instead of an AttributeError."

	self assert: (self eval: '[Decimal("1.5").is_nan(), Decimal("1.5").is_snan(),
 Decimal("1.5").is_qnan(), Decimal("1.5").is_infinite(),
 Decimal("1.5").is_finite(), Decimal("0.00").is_zero(),
 Decimal("1.5").is_zero(), Decimal("-1.5").is_signed(),
 Decimal("1.5").is_signed()]')
		@env1:__repr__
		equals: '[False, False, False, False, True, True, False, True, False]'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testSpecialsAndMalformedLiteralsRaiseCatchably
	"REGRESSION: these all used to KILL THE PROCESS.

	``Decimal('nan')'' and ``Decimal('abc')'' reached ScaledDecimal
	fromString:, which signals ImproperOperation (error 2185,
	rtErrBadFormat) -- a raw Smalltalk error that escapes ``except
	BaseException'' entirely, so the interpreter terminated instead of
	raising.  Measured before this change; every case below was fatal.

	ArithmeticError rather than ValueError because CPython raises
	decimal.InvalidOperation, which IS an ArithmeticError subclass -- so
	``except ArithmeticError'' behaves identically in Grail and in CPython.
	It cannot be the real InvalidOperation: that class is defined in
	decimal.py and a Python module attribute is not reachable from
	Smalltalk.  Wiring it is one line in whichever Python layer ends up
	owning the module.

	NaN and Infinity are UNSUPPORTED, not merely unimplemented: there is no
	encoding for them in a (mantissa, scale) pair.  An honest error is the
	whole deliverable here."

	self assert: (self eval: 'out = []
for lit in ["nan", "sNaN", "NaN", "Infinity", "inf", "-inf", "+Inf",
            "abc", "", "1.2.3", "1e", "e5", "1.5x", "--1"]:
    try:
        Decimal(lit)
        out.append("NO-RAISE")
    except ArithmeticError:
        out.append("ArithmeticError")
    except BaseException as ex:
        out.append("OTHER:" + type(ex).__name__)
out')
		@env1:__repr__
		equals: '[''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testInfiniteAndNanFloatsRaiseCatchably
	"Decimal(float('inf')) and Decimal(float('nan')) raise ArithmeticError
	for the same reason the string spellings do -- there is no encoding --
	rather than answering a wrong finite number.  The float kind is read
	with #_getKind (3 = infinity, 5 = NaN), the same test Fraction.gs uses."

	self assert: (self eval: 'out = []
for v in [float("inf"), float("-inf"), float("nan")]:
    try:
        Decimal(v)
        out.append("NO-RAISE")
    except ArithmeticError:
        out.append("ArithmeticError")
out')
		@env1:__repr__
		equals: '[''ArithmeticError'', ''ArithmeticError'', ''ArithmeticError'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testFloatAndFractionArithmeticRaiseTypeError
	"Mixing a Decimal with a float or a Fraction in ARITHMETIC is a
	TypeError, as it is in CPython.

	This NARROWS #845's guard, which admitted any Number: ScaledDecimal's
	generality coercion then silently answered a Float for
	``Decimal + float'' and a Fraction for ``Decimal + Fraction''.  A wrong
	TYPE with a plausible value is the failure mode that hides, and CPython
	raises for both -- test_fractions' testMixingWithDecimal asserts the
	Fraction case in both directions.

	The float case is the one that matters most in practice, because the
	whole reason to reach for a Decimal is to keep floats out."

	self assert: (self eval: 'import fractions
out = []
ops = [lambda a, b: a + b, lambda a, b: a - b, lambda a, b: a * b,
       lambda a, b: a / b, lambda a, b: a // b, lambda a, b: a % b]
for b in [2.0, fractions.Fraction(1, 2)]:
    for op in ops:
        try:
            op(Decimal("1.5"), b)
            out.append("NO-RAISE")
        except TypeError:
            out.append("TypeError")
# A str operand: the same five, minus %.  ``Decimal % str'' reaches str''s
# __rmod__ (Python''s string-formatting operator), which Grail answers with
# a bare "Not yet implemented: __rmod__" that escapes except BaseException --
# a Str.gs gap, not a Decimal one, so it is left out rather than pinned here.
for op in ops[:5]:
    try:
        op(Decimal("1.5"), "a")
        out.append("NO-RAISE")
    except TypeError:
        out.append("TypeError")
[len(out), sorted(set(out))]')
		@env1:__repr__
		equals: '[17, [''TypeError'']]'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testComparisonsStayWideWhereArithmeticIsNarrow
	"A Decimal may be ORDERED against an int, a float and a Fraction even
	though ADDING one is a TypeError.

	That asymmetry is CPython's own -- _convert_for_comparison admits what
	_convert_other refuses -- and it has to be honoured deliberately here,
	because the narrow arithmetic guard would otherwise be copied onto the
	comparison dunders and break ``Decimal('0.5') < 0.6''.

	Equality against a NON-number answers False rather than raising, again
	as CPython does; ORDERING against one still raises TypeError.  The
	env-0 #= was measured to answer false for a String rather than reaching
	the generality coercion, so equality can delegate safely while ordering
	must stay guarded."

	self assert: (self eval: 'import fractions
[Decimal("0.5") < 0.6, Decimal("0.5") == 0.5, Decimal("0.5") > 0.4,
 Decimal("0.5") == fractions.Fraction(1, 2),
 Decimal("0.5") < fractions.Fraction(3, 4),
 Decimal("2") == 2, Decimal("2") <= 2, Decimal("2") >= 2,
 Decimal("1.50") == Decimal("1.5"), Decimal("1.5") == "a",
 Decimal("1.5") != "a"]')
		@env1:__repr__
		equals: '[True, True, True, True, True, True, True, True, True, False, True]'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testOrderingAgainstNonNumberRaisesTypeError
	"Ordering a Decimal against a non-number is a catchable TypeError.

	Guarded for the same reason #845 guarded the arithmetic dunders: an
	unguarded env-0 #< hands the operand to GemStone's Number generality
	coercion, which sends env-0 #_generality to it, and an env-0 miss is a
	raw Smalltalk MessageNotUnderstood that no Python ``except'' can see.
	The comparison dunders were left unguarded by #845 -- they were not part
	of the six -- so this closes that half."

	self assert: (self eval: 'out = []
for op in [lambda a, b: a < b, lambda a, b: a <= b,
           lambda a, b: a > b, lambda a, b: a >= b]:
    try:
        op(Decimal("1.5"), "a")
        out.append("NO-RAISE")
    except TypeError:
        out.append("TypeError")
out')
		@env1:__repr__
		equals: '[''TypeError'', ''TypeError'', ''TypeError'', ''TypeError'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testZeroArgumentAndContextArgumentConstructors
	"Decimal() answers Decimal('0'), and Decimal(value, context) accepts and
	ignores the context -- both CPython spellings.  Neither existed before:
	__new__: was one-argument only, so ``Decimal()'' had no method to reach
	and the two-argument form (which twilio writes) had none either."

	self assert: (self eval: '[str(Decimal()), str(Decimal("1.50", None)),
 str(Decimal(42, None))]')
		@env1:__repr__
		equals: '[''0'', ''1.50'', ''42'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testTrailingZerosSurviveTheWholeIssue
	"The one-line statement of what issue #846 is about.

	``Decimal('1.50')'' must print 1.50.  On the pure-Python rational
	implementation the trailing zero is STRUCTURALLY unrepresentable --
	1.50 and 1.5 are the same rational -- and str() answered '1.5'.  A
	(mantissa, scale) pair carries it, and every operation below preserves
	it the way CPython does: addition and subtraction take the larger
	scale, multiplication adds the exponents, and quantize sets it
	outright."

	self assert: (self eval: '[str(Decimal("1.50")), str(Decimal("1.500")),
 str(Decimal("1.50") + Decimal("0.005")),
 str(Decimal("1.50") - Decimal("0.50")),
 str(Decimal("1.50") * Decimal("1.00")),
 str(Decimal("1.5").quantize(Decimal("0.0001"))),
 str(Decimal("19.99") * 3), Decimal("1.50") == Decimal("1.5"),
 Decimal("1.50").as_tuple() == Decimal("1.5").as_tuple()]')
		@env1:__repr__
		equals: '[''1.50'', ''1.500'', ''1.505'', ''1.00'', ''1.5000'', ''1.5000'', ''59.97'', True, False]'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testDivisionByZeroIsCatchable
	"REGRESSION: dividing by zero used to KILL THE PROCESS for // and %.

	Both delegate to env-0 #// and #\\, and a zero divisor there raises
	GemStone's ZeroDivide (error 2026, numErrIntDivisionByZero) -- a raw
	Smalltalk error that escapes ``except BaseException'', so the
	interpreter terminated instead of raising.  Measured before the guard,
	one expression per process:
	  Decimal('1') // Decimal('0')  -> a ZeroDivide occurred (error 2026)
	  Decimal('1') %  Decimal('0')  -> a ZeroDivide occurred (error 2026)

	__truediv__: and __pow__: never had the problem -- they do their own
	coefficient arithmetic and test the divisor -- but they are asserted
	here too so all four live in one place.  A zero divisor whose SCALE is
	non-zero ('0.00', coefficient 0) is included because the test has to be
	on the coefficient, not on the printed form.

	ZeroDivisionError rather than CPython's DivisionByZero/InvalidOperation
	split: there is no signal machinery here to route those through, and
	decimal.py's DivisionByZero IS a ZeroDivisionError subclass, so one
	``except ZeroDivisionError'' catches either implementation."

	self assert: (self eval: 'out = []
for f in [lambda: Decimal("1") / Decimal("0"),
          lambda: Decimal("1") / 0,
          lambda: Decimal("1.5") / Decimal("0.00"),
          lambda: Decimal("1") // Decimal("0"),
          lambda: Decimal("1") // 0,
          lambda: Decimal("1") % Decimal("0"),
          lambda: Decimal("1") % Decimal("0.000"),
          lambda: Decimal("0") ** -1]:
    try:
        f()
        out.append("NO-RAISE")
    except ZeroDivisionError:
        out.append("ZeroDivisionError")
[len(out), sorted(set(out)), str(Decimal("0") / Decimal("2.5"))]')
		@env1:__repr__
		equals: '[8, [''ZeroDivisionError''], ''0'']'
%
