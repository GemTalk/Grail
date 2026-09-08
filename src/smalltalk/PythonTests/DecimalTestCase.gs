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
	d := (ScaledDecimal ___new___: '-42.5').

	result := (d @env1:__abs__).

	self assert: (result @env1:__str__) equals: '42.5'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testVendoredDecimalArithmetic
	"``from decimal import Decimal'' is CPython's own Decimal now, and this
	test is where that shows up most sharply.

	THE ONE CHANGED ASSERTION, and it is the important one in this file:

	  D(1)/D(3) + D(1)/D(3) + D(1)/D(3) == D(1)
	      was True   now False

	That is CORRECT, and it is the whole point of replacing the module.  The
	old implementation carried a Decimal as an exact RATIONAL, so a third
	really was a third and the three of them summed to exactly 1.  CPython's
	Decimal cannot hold a third: ``/'' rounds to the context precision at the
	moment it happens, so each term is 0.3333333333333333333333333333 (28
	digits) and the sum is 0.9999999999999999999999999999.  Verified on the
	stone.  Anything that relied on long division staying exact moves with
	this, and it moves SILENTLY rather than raising -- which is why the value
	is asserted here rather than left to be discovered.

	The property issue #846 exists to defend is NOT this one and does
	survive: D('0.1') + D('0.2') == D('0.3') is True under CPython's decimal
	too, because those three all have finite decimal expansions.  It is
	pinned in testTrailingZerosSurviveTheWholeIssue and was the first thing
	checked before any of this landed.

	Everything else here is unchanged: *, +, int/float equality by
	reflection, and sqrt().  The test was renamed with the change
	(testStubDecimalArithmetic) because the module is no longer a stub.  The
	two Grail landmines the old comment recorded are both gone -- the
	type(self) self-reference workaround and the module-name import
	mis-resolution were consequences of the ``Decimal'' name binding and of
	the module being hand-written; the vendored file needs neither and is
	byte-for-byte CPython."

	self assert: (self eval: 'from decimal import Decimal as D
[str(D(3.5) * D(4.5)), D(13) == 13, 13.0 == D(13), float(D(2.5)),
 str(D(1.5) + D(2.5)), 25 * D(4.0) == D(100), type(D(1) + D(2)).__name__,
 D(1)/D(3) + D(1)/D(3) + D(1)/D(3) == D(1), float(D(2).sqrt())]')
		@env1:__repr__
		equals: '[''15.75'', True, True, 2.5, ''4.0'', True, ''Decimal'', False, 1.4142135623730951]'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testAddition
	"Test Decimal addition"

	| d1 d2 result |
	d1 := (ScaledDecimal ___new___: '10.5').
	d2 := (ScaledDecimal ___new___: '20.3').
	
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
	d := (ScaledDecimal ___new___: 3.14).
	
	"Float conversion may not be exact, so just check it's close"
	self assert: ((d @env1:__float__) - 3.14) abs < 0.01
%

category: 'Grail-Tests - Creation'
method: DecimalTestCase
testCreateFromInteger
	"Test creating Decimal from integer"

	| d |
	d := (ScaledDecimal ___new___: 42).
	
	self assert: (d @env1:__int__) = 42
%

category: 'Grail-Tests - Creation'
method: DecimalTestCase
testCreateFromString
	"Test creating Decimal from string"

	| d |
	d := (ScaledDecimal ___new___: '123.45').
	
	self assert: (d @env1:__str__) equals: '123.45'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testDivision
	"Test Decimal division"

	| d1 d2 result |
	d1 := (ScaledDecimal ___new___: '10.0').
	d2 := (ScaledDecimal ___new___: '4.0').
	
	result := (d1 @env1:__truediv__: d2).
	
	self assert: (result @env1:__str__) equals: '2.5'
%

category: 'Grail-Tests - Comparison'
method: DecimalTestCase
testEquality
	"Test Decimal equality"

	| d1 d2 d3 |
	d1 := (ScaledDecimal ___new___: '42.5').
	d2 := (ScaledDecimal ___new___: '42.5').
	d3 := (ScaledDecimal ___new___: '42.6').
	
	self assert: (d1 @env1:__eq__: d2).
	self deny: (d1 @env1:__eq__: d3)
%

category: 'Grail-Tests - Comparison'
method: DecimalTestCase
testLessThan
	"Test Decimal less than comparison"

	| d1 d2 |
	d1 := (ScaledDecimal ___new___: '10.5').
	d2 := (ScaledDecimal ___new___: '20.3').
	
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
	d1 := (ScaledDecimal ___new___: '3.5').
	d2 := (ScaledDecimal ___new___: '2.0').
	
	result := (d1 @env1:__mul__: d2).
	
	self assert: (result @env1:__str__) equals: '7.00'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testNegation
	"Test Decimal negation"

	| d result |
	d := (ScaledDecimal ___new___: '42.5').
	
	result := (d @env1:__neg__).
	
	self assert: (result @env1:__str__) equals: '-42.5'
%

category: 'Grail-Tests - Arithmetic'
method: DecimalTestCase
testSubtraction
	"Test Decimal subtraction"

	| d1 d2 result |
	d1 := (ScaledDecimal ___new___: '50.7').
	d2 := (ScaledDecimal ___new___: '20.3').
	
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

	TWO CHANGED ASSERTIONS, both because decimal is now CPython's own
	implementation rather than a rational-backed subset:

	  round(D('1.005'), 2)   was ''1.0''       now ''1.00''
	  round(D('12345'), -2)  was ''12300.0''  now ''1.23E+4''

	Both old values were artefacts of the subset, and the comment here used
	to explain the first one away: str() went through float(), so a value of
	exactly 1 printed as '1.0' and the two-place EXPONENT was not carried at
	all.  A real Decimal keeps the exponent quantize gave it, so rounding to
	2 places yields exponent -2 and prints '1.00'; rounding to -2 places
	yields exponent +2, which prints in scientific notation because that is
	what an exponent of +2 with coefficient 123 IS.  These are CPython's
	answers, verified on the stone."

	self assert: (self eval: 'from decimal import Decimal as D
[round(D("2.5")), round(D("3.5")), round(D("-2.5")), round(D("-3.5")),
 str(round(D("2.675"), 2)), str(round(D("1.005"), 2)),
 str(round(D("12345"), -2)), type(round(D("2.5"))).__name__,
 type(round(D("2.5"), 2)).__name__, round(D("2.5"), None)]')
		@env1:__repr__
		equals: '[2, 4, -2, -4, ''2.68'', ''1.00'', ''1.23E+4'', ''int'', ''Decimal'', 2]'
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

	These three expressions are exactly the previously-fatal ones.

	ONE CHANGED ASSERTION:  str(round(D('2.5'), 0))  was ''2.0''  now ''2''

	round(d, 0) quantizes to exponent 0, and a real Decimal with exponent 0
	prints without a fractional part.  ''2.0'' was the subset's float-routed
	__str__ inventing a decimal place the value did not have.  The point of
	the test -- that these three do not kill the process -- is unchanged."

	self assert: (self eval: 'from decimal import Decimal as D
[str(round(D("2.675"), 2)), str(round(D("2.5"), 0)),
 format(D("19.99") * 3, ".2f")]')
		@env1:__repr__
		equals: '[''2.68'', ''2'', ''59.97'']'
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
testFormatSupportsExponentAndPercentCodes
	"__format__ handles the exponent-bearing presentation types, and still
	rejects a malformed spec.

	THE PREMISE OF THIS TEST INVERTED, and it was renamed with it
	(testFormatRejectsUnsupportedCodes).  It asserted that four of these
	five specs raise ValueError, for a reason that was true of the subset
	and is not true of a Decimal: ''e'', ''g'' and ''%'' all need a decimal
	EXPONENT to present, and the old rational-backed value had none -- it
	carried a numerator and a denominator, so those codes were refused
	rather than approximated.  CPython's Decimal carries an exponent by
	construction, so all three are ordinary formatting, and ''#'' is
	accepted as well.

	  format(D('1.5'), '.2e')   was ValueError  now ''1.50e+0''
	  format(D('1.5'), 'g')     was ValueError  now ''1.5''
	  format(D('1.5'), '%')     was ValueError  now ''150%''
	  format(D('1.5'), '#.2f')  was ValueError  now ''1.50''
	  format(D('1.5'), '.f')    ValueError, UNCHANGED

	Asserting the VALUES rather than counting raises, because that is the
	stronger test and the one the old shape could not make.  The last case
	is kept exactly as it was: a bare ''.'' with no digits is a malformed
	spec in any implementation, so it is the control that shows ValueError
	is still reachable."

	self assert: (self eval: 'from decimal import Decimal as D
out = []
for spec in [".2e", "g", "%", "#.2f"]:
    out.append(format(D("1.5"), spec))
try:
    format(D("1.5"), ".f")
    out.append("NO-RAISE")
except ValueError:
    out.append("ValueError")
out')
		@env1:__repr__
		equals: '[''1.50e+0'', ''1.5'', ''150%'', ''1.50'', ''ValueError'']'
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
	holds for the truncated pair as well as the floored one.

	ELEVEN CHANGED ASSERTIONS, all the same one-character change and all in
	the same direction -- the subset's float-routed __str__ printed an
	integral Decimal with a spurious ''.0'':

	  D('7')  // D('2')   was ''3.0''   now ''3''
	  D('7')  %  D('2')   was ''1.0''   now ''1''
	  D('-7') // D('2')   was ''-3.0''  now ''-3''
	  D('-7') %  D('2')   was ''-1.0''  now ''-1''
	  D('7')  // D('-2')  was ''-3.0''  now ''-3''
	  D('7')  %  D('-2')  was ''1.0''   now ''1''
	  divmod(D('-7'), D('2'))  was (''-3.0'', ''-1.0'')  now (''-3'', ''-1'')
	  D('7') // 2         was ''3.0''   now ''3''
	  7 // D('2')         was ''3.0''   now ''3''
	  7 %  D('2')         was ''1.0''   now ''1''

	The two non-integral cases are UNCHANGED (''0.0'' and ''0.5''), which is
	the useful control: 7.5 % 2.5 really does have exponent -1, so its zero
	is real, and only the invented ones moved.  Every truncation and every
	sign above is the same as before -- the semantics did not change here,
	only the rendering."

	self assert: (self eval: 'from decimal import Decimal as D
[str(D("7") // D("2")), str(D("7") % D("2")),
 str(D("-7") // D("2")), str(D("-7") % D("2")),
 str(D("7") // D("-2")), str(D("7") % D("-2")),
 str(divmod(D("-7"), D("2"))[0]), str(divmod(D("-7"), D("2"))[1]),
 str(D("7") // 2), str(7 // D("2")), str(7 % D("2")),
 (D("-7") // D("2")) * D("2") + (D("-7") % D("2")) == D("-7"),
 str(D("7.5") % D("2.5")), str(D("1.5") % D("1"))]')
		@env1:__repr__
		equals: '[''3'', ''1'', ''-3'', ''-1'', ''-3'', ''1'', ''-3'', ''-1'', ''3'', ''3'', ''1'', True, ''0.0'', ''0.5'']'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testDivisionByZeroAndNonCoercibleOperands
	"// % and divmod by zero raise the General Decimal Arithmetic signal
	CPython raises, and a non-coercible operand raises TypeError.

	FOUR CHANGED ASSERTIONS.  This test caught ``except ZeroDivisionError''
	and expected that spelling for all four zero-divisor cases, because the
	old hand-written module had no signal machinery and raised a plain
	ZeroDivisionError for every one of them.  CPython splits them, and the
	vendored module does too:

	  D('7') // D('0')       was ZeroDivisionError  now DivisionByZero
	  D('7') %  D('0')       was ZeroDivisionError  now InvalidOperation
	  divmod(D('7'), D('0')) was ZeroDivisionError  now DivisionByZero
	  7 // D('0')            was ZeroDivisionError  now DivisionByZero

	``%'' by zero is InvalidOperation rather than DivisionByZero because the
	remainder of a division by zero is undefined, not infinite -- that is
	the spec's distinction, and having it is an improvement the subset could
	not express.  The two TypeError cases are UNCHANGED: mixed
	Decimal/Fraction arithmetic is a TypeError in CPython too
	(test_fractions' testMixingWithDecimal asserts it in both directions).

	KNOWN GAP, pinned deliberately in the last case.  decimal.DivisionByZero
	subclasses ZeroDivisionError -- issubclass() says True and
	ZeroDivisionError is in its __mro__ -- but ``except ZeroDivisionError''
	does NOT catch it here, while ``except ArithmeticError'' (its
	SUPERCLASS), ``except DecimalException'' and ``except Exception'' all
	do.  So the failure is specific to that one built-in class, not to
	multiple inheritance generally.  It is a defect in Grail's except
	matching for a Python exception class that reaches a built-in exception
	through its second base, NOT something this change introduced -- the old
	module simply never raised such a class, so nothing exercised it.  It is
	asserted as the CURRENT behaviour so the gap is visible and so fixing it
	breaks this line rather than passing unnoticed."

	self assert: (self eval: 'from decimal import Decimal as D
import fractions
out = []
for fn in [lambda: D("7") // D("0"), lambda: D("7") % D("0"),
           lambda: divmod(D("7"), D("0")), lambda: 7 // D("0"),
           lambda: D("7") // "a", lambda: D("7") // fractions.Fraction(1, 2)]:
    try:
        fn()
        out.append("NO-RAISE")
    except BaseException as ex:
        out.append(type(ex).__name__)
# KNOWN GAP: DivisionByZero IS a ZeroDivisionError subclass, but that one
# except clause does not match it.  ArithmeticError, its own superclass, does.
try:
    D("7") // D("0")
    out.append("NO-RAISE")
except ZeroDivisionError:
    out.append("caught-as-ZeroDivisionError")
except ArithmeticError:
    out.append("GAP: missed by ZeroDivisionError, caught by ArithmeticError")
out')
		@env1:__repr__
		equals: '[''DivisionByZero'', ''InvalidOperation'', ''DivisionByZero'', ''DivisionByZero'', ''TypeError'', ''TypeError'', ''GAP: missed by ZeroDivisionError, caught by ArithmeticError'']'
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
	sd := ScaledDecimal ___new___: '10.5'.
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
	sd := ScaledDecimal ___new___: '10.5'.
	self assert: (sd @env1:__mul__: 2) @env1:__str__ equals: '21.0'.
	self assert: (sd @env1:__add__: 2) @env1:__str__ equals: '12.5'.
	self assert: (sd @env1:__sub__: 2) @env1:__str__ equals: '8.5'.
	self assert: (sd @env1:__mul__: (ScaledDecimal ___new___: '2.0')) @env1:__str__
		equals: '21.00'.
	self assert: (sd @env1:__floordiv__: 2) @env1:__str__ equals: '5'.
	self assert: (sd @env1:__truediv__: 2) @env1:__str__ equals: '5.25'.
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

	TWO CHANGED ASSERTIONS, now that decimal is CPython's own module:

	  format(D(1) / D(3), 'f')  was ''0.333333''
	                            now ''0.3333333333333333333333333333''
	  format(D('1.5'), 's')     was ''1.5''  now ValueError

	The first is the headline of the whole change.  The old value carried
	one THIRD exactly, as a rational, and had no finite decimal expansion
	at all -- so 'f' fell back to six places.  A real Decimal cannot hold a
	third: division rounds to the context precision (28) at the moment it
	happens, so the value IS those 28 digits and 'f' shows them.  The old
	comment called that state one 'a CPython Decimal can never reach', which
	was right, and is exactly why the assertion had to move.

	The second is CPython being stricter: 's' is not a valid presentation
	type for a Decimal, and the subset accepted it by falling through to
	str().  It is asserted as a raise below rather than dropped.

	Decimal(0.1) is UNCHANGED and is the control worth keeping: the exact
	55-digit binary expansion is byte-for-byte what it always was, because
	Decimal(float) is exact in CPython too -- construction does not round,
	only arithmetic does."

	self assert: (self eval: 'from decimal import Decimal as D
out = [format(D("1.5"), "f"), format(D("1.50"), "f"), format(D("1.500"), "f"),
 format(D("100"), "f"), format(D("0.001"), "f"), format(D("19.99") * 3, "f"),
 format(D("-1.5"), "f"), format(D("0"), "f"), format(D("3"), "f"),
 format(D("12345678901234567890"), "f"), format(D("1.5"), "F"),
 format(D("1.50"), "10f"), format(D("-1.50"), "+f"), format(D("1234567.891"), ",f"),
 format(D(0.1), "f"), format(D(1) / D(3), "f"),
 format(D("1.5"), ".6f"), format(D("1.5"), ".0f"), format(D("1.5"), ".2f"),
 format(D("1.5"), "")]
try:
    out.append(format(D("1.5"), "s"))
except ValueError:
    out.append("ValueError")
out')
		@env1:__repr__
		equals: '[''1.5'', ''1.50'', ''1.500'', ''100'', ''0.001'', ''59.97'', ''-1.5'', ''0'', ''3'', ''12345678901234567890'', ''1.5'', ''      1.50'', ''-1.50'', ''1,234,567.891'', ''0.1000000000000000055511151231257827021181583404541015625'', ''0.3333333333333333333333333333'', ''1.500000'', ''2'', ''1.50'', ''1.5'', ''ValueError'']'
%

category: 'Grail-Tests - Stub module'
method: DecimalTestCase
testDivisionByZeroDoesNotBuildAPoisonedValue
	"REGRESSION: Decimal(1) / Decimal(0) built a POISONED value.

	It raised nothing and answered a Decimal with _den == 0, which then
	failed somewhere unrelated -- the worst shape a numeric bug can take.
	CPython raises decimal.DivisionByZero, which this module has declared
	all along and never raised.

	The guard sits in the (num, den) fast path of __init__, the ONE route
	that can carry a zero denominator: every other branch derives the
	denominator from a power of ten or from as_integer_ratio(), both >= 1.
	So it covers the reflected form and Decimal(0) ** -1 as well as the
	direct one, and any later caller of _new.

	THE TWO DELIBERATE DEVIATIONS THIS TEST RECORDED ARE NOW GONE, which is
	the change here.  The old comment named them as consequences of the
	hand-written module having no signal machinery: it raised its single
	zero-divisor exception where CPython answers InvalidOperation
	(DivisionUndefined) for 0/0, and where CPython answers
	Decimal('Infinity') for Decimal(0) ** -1.  The vendored module has the
	real signal machinery, so both now behave as CPython does:

	  D(0) / D(0)   was DivisionByZero  now InvalidOperation
	  D(0) ** -1    was DivisionByZero  now NO-RAISE (answers Infinity)

	The five genuine zero-divisor cases are UNCHANGED and still
	DivisionByZero, which is what the regression this test is named for was
	about: D(1)/D(0) must raise rather than build a value with a zero
	denominator that fails somewhere unrelated later.  ``str(D(1)/D(2))''
	stays as the control that ordinary division still works.

	The last case is a KNOWN GAP and changed with it: ``except
	ZeroDivisionError'' does not catch DivisionByZero even though it is a
	subclass (see testDivisionByZeroAndNonCoercibleOperands for the full
	diagnosis -- ArithmeticError, its own superclass, does catch it).  It is
	pinned as current behaviour rather than removed."

	self assert: (self eval: 'from decimal import Decimal as D, DivisionByZero
from decimal import InvalidOperation
out = []
try:
    D(1) / D(0)
    out.append("NO-RAISE")
except DivisionByZero:
    out.append("DivisionByZero")
try:
    D(-1) / D(0)
    out.append("NO-RAISE")
except DivisionByZero:
    out.append("DivisionByZero")
try:
    D(0) / D(0)
    out.append("NO-RAISE")
except DivisionByZero:
    out.append("DivisionByZero")
except InvalidOperation:
    out.append("InvalidOperation")
try:
    D(1) / 0
    out.append("NO-RAISE")
except DivisionByZero:
    out.append("DivisionByZero")
try:
    1 / D(0)
    out.append("NO-RAISE")
except DivisionByZero:
    out.append("DivisionByZero")
try:
    D(1.5) / D(0.0)
    out.append("NO-RAISE")
except DivisionByZero:
    out.append("DivisionByZero")
try:
    D(0) ** -1
    out.append("NO-RAISE")
except DivisionByZero:
    out.append("DivisionByZero")
out.append(str(D(1) / D(2)))
try:
    D(1) / D(0)
    out.append("NO-RAISE")
except ZeroDivisionError as ex:
    out.append("caught-as-ZeroDivisionError")
except ArithmeticError as ex:
    out.append("GAP: missed by ZeroDivisionError")
out')
		@env1:__repr__
		equals: '[''DivisionByZero'', ''DivisionByZero'', ''InvalidOperation'', ''DivisionByZero'', ''DivisionByZero'', ''DivisionByZero'', ''NO-RAISE'', ''0.5'', ''GAP: missed by ZeroDivisionError'']'
%

! ===============================================================================
! ScaledDecimal storage-level conformance (issue #846)
! ===============================================================================
! Everything below exercises GemStone's ScaledDecimal -- the kernel numeric --
! and NOT decimal.Decimal, which is now CPython's own vendored class.  These are
! the INTEROP tests: what a ScaledDecimal does when Python touches it, which is
! the contract that matters for Smalltalk-authored and already-persisted values.
!
! ``self eval:'' is used where the point is that the PYTHON path produces the
! answer, and a direct @env1: send where the point is the storage itself.  Note
! that ``self eval:'' must NOT import decimal in these tests: that would bring
! in the real Decimal and measure the wrong class.
!
! HOW THESE TESTS NAME THE CLASS.  They used to write a bare ``Decimal(...)'',
! which resolved to ScaledDecimal only because install.gs bound that Python
! name to it.  The binding is gone, so a bare ``Decimal'' is now a NameError
! (pinned in ClassCallFastPathTestCase) and no Python global names ScaledDecimal
! either.  Each eval therefore binds the name for its own expression with
! ``with: { #ScaledDecimal -> ScaledDecimal }'' (PythonTestCase >> eval:with:).
! The alias is local and visible at the call site, so the Python source says
! exactly which class it means without anything globally answering to two.

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

	self assert: (self eval: '[str(ScaledDecimal("1.50")), repr(ScaledDecimal("1.50")),
 str(ScaledDecimal("100")), str(ScaledDecimal("0.5")), str(ScaledDecimal("0.00")),
 str(ScaledDecimal("-1.50")), str(ScaledDecimal("0.000001")), str(ScaledDecimal("1e-7")),
 str(ScaledDecimal("-1e-7")), str(ScaledDecimal(0))]' with: { #ScaledDecimal -> ScaledDecimal })
		@env1:__repr__
		equals: '[''1.50'', "ScaledDecimal(''1.50'')", ''100'', ''0.5'', ''0.00'', ''-1.50'', ''0.000001'', ''1E-7'', ''-1E-7'', ''0'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testTypeNameIsScaledDecimalForBothBackingClasses
	"``type(x).__name__'' answers 'ScaledDecimal' for BOTH backing classes.

	CHANGED ASSERTION.  This test used to expect 'Decimal':

	  was:  ['Decimal', 'Decimal', 'Decimal']
	  now:  ['ScaledDecimal', 'ScaledDecimal', 'ScaledDecimal']

	and it was renamed with the value (testTypeNameIsDecimalForBoth...).
	The 'Decimal' answer came from an entry in Object.gs's type-name table
	rewriting the name, which is gone: decimal.Decimal is CPython's own
	class now, and two unrelated classes cannot both answer to one name.

	What the test still covers is the half that was always a real
	ambiguity, and it is unchanged: every literal and every #fromString:
	result is a SmallScaledDecimal until it outgrows the special encoding,
	so without __class__ the two kernel spellings leaked into type names
	and reprs for one Python-visible type.  __class__ normalises them onto
	ScaledDecimal -- type() asks it (object >> ___pyMetaclass___ routes a
	non-class receiver through it), the same hook the integer, float and
	dict-view families use.  The large value is included because it is a
	genuinely different Smalltalk class."

	self assert: (self eval: '[type(ScaledDecimal("1.50")).__name__,
 type(ScaledDecimal("1e-40") * ScaledDecimal("1e-40")).__name__,
 type(ScaledDecimal(42)).__name__]' with: { #ScaledDecimal -> ScaledDecimal })
		@env1:__repr__
		equals: '[''ScaledDecimal'', ''ScaledDecimal'', ''ScaledDecimal'']'
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

	self assert: (self eval: '[str(ScaledDecimal("1E+5")), str(ScaledDecimal("5e3")),
 str(ScaledDecimal("1.5e3")), str(ScaledDecimal("1.5e-3")), str(ScaledDecimal("-2.5E-4")),
 str(ScaledDecimal("1_000.5")), str(ScaledDecimal("  1.25  ")), str(ScaledDecimal("+1.25")),
 str(ScaledDecimal(".5")), str(ScaledDecimal("5."))]' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[str(ScaledDecimal(0.1)), str(ScaledDecimal(3.5)),
 str(ScaledDecimal(4.0)), str(ScaledDecimal(0.5)), ScaledDecimal(0.1) == ScaledDecimal(0.1),
 float(ScaledDecimal(0.1)) == 0.1]' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[str(ScaledDecimal("3.10") * ScaledDecimal("1.005")),
 str(ScaledDecimal("1.50") * ScaledDecimal("1.50")), str(ScaledDecimal("0.1") * ScaledDecimal("0.1")),
 str(ScaledDecimal("3.5") * ScaledDecimal("2.0")), str(ScaledDecimal("10.5") * 2),
 str(ScaledDecimal("-1.5") * ScaledDecimal("2.00")), str(ScaledDecimal("0") * ScaledDecimal("1.50"))]' with: { #ScaledDecimal -> ScaledDecimal })
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
	a := ScaledDecimal ___new___: '1.00'.
	b := ScaledDecimal ___new___: '3.00'.
	self assert: (a @env1:__truediv__: b) @env1:__str__
		equals: '0.3333333333333333333333333333'.
	self assert: ((ScaledDecimal ___new___: '10.0') @env1:__truediv__:
		(ScaledDecimal ___new___: '4.0')) @env1:__str__ equals: '2.5'.
	self assert: ((ScaledDecimal ___new___: '10.5') @env1:__truediv__: 2)
		@env1:__str__ equals: '5.25'.
	self assert: ((ScaledDecimal ___new___: '1') @env1:__truediv__:
		(ScaledDecimal ___new___: '7')) @env1:__str__
		equals: '0.1428571428571428571428571429'.
	[ScaledDecimal @env1:___setPrecision___: 5.
	 self assert: (a @env1:__truediv__: b) @env1:__str__ equals: '0.33333'.
	 ScaledDecimal @env1:___setPrecision___: 9.
	 self assert: (a @env1:__truediv__: b) @env1:__str__ equals: '0.333333333']
		ensure: [ScaledDecimal @env1:___setPrecision___: 28]
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

	self assert: (self eval: '[str(ScaledDecimal("1.5") ** 2), str(ScaledDecimal("1.5") ** 0),
 str(ScaledDecimal("1.5") ** 1), str(ScaledDecimal("0.1") ** 3), str(ScaledDecimal("2") ** -1),
 str(ScaledDecimal("2") ** -2), str(ScaledDecimal("-1.5") ** 3), str(ScaledDecimal("10") ** 3)]' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[str(ScaledDecimal("3.11550").quantize(ScaledDecimal("0.01"))),
 str(ScaledDecimal("2.675").quantize(ScaledDecimal("0.01"))),
 str(ScaledDecimal("1.5").quantize(ScaledDecimal("0.001"))),
 str(ScaledDecimal("-1.567").quantize(ScaledDecimal("0.01"))),
 str(ScaledDecimal("1.005").quantize(ScaledDecimal("0.01"))),
 str(ScaledDecimal("12345").quantize(ScaledDecimal("1"))),
 str(ScaledDecimal("2.5").quantize(ScaledDecimal("1"))),
 str(ScaledDecimal("3.5").quantize(ScaledDecimal("1")))]' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[str(ScaledDecimal("1.001").quantize(ScaledDecimal("0.01"), "ROUND_UP")),
 str(ScaledDecimal("1.009").quantize(ScaledDecimal("0.01"), "ROUND_DOWN")),
 str(ScaledDecimal("1.005").quantize(ScaledDecimal("0.01"), "ROUND_HALF_UP")),
 str(ScaledDecimal("1.005").quantize(ScaledDecimal("0.01"), "ROUND_HALF_DOWN")),
 str(ScaledDecimal("1.005").quantize(ScaledDecimal("0.01"), "ROUND_HALF_EVEN")),
 str(ScaledDecimal("1.001").quantize(ScaledDecimal("0.01"), "ROUND_CEILING")),
 str(ScaledDecimal("1.009").quantize(ScaledDecimal("0.01"), "ROUND_FLOOR")),
 str(ScaledDecimal("-1.001").quantize(ScaledDecimal("0.01"), "ROUND_CEILING")),
 str(ScaledDecimal("-1.001").quantize(ScaledDecimal("0.01"), "ROUND_FLOOR"))]' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[ScaledDecimal("1.50").as_tuple(), ScaledDecimal("-0.5").as_tuple(),
 ScaledDecimal("0").as_tuple(), ScaledDecimal("123").as_tuple(),
 ScaledDecimal("0.000001").adjusted(), ScaledDecimal("123.45").adjusted(),
 ScaledDecimal("1.50").adjusted(), ScaledDecimal("0.00").adjusted(),
 str(ScaledDecimal("1.50").normalize()), str(ScaledDecimal("1.000").normalize()),
 str(ScaledDecimal("100").normalize()), str(ScaledDecimal("0.00").normalize())]' with: { #ScaledDecimal -> ScaledDecimal })
		@env1:__repr__
		equals: '[(0, (1, 5, 0), -2), (1, (5,), -1), (0, (0,), 0), (0, (1, 2, 3), 0), -6, 2, 0, -2, ''1.5'', ''1'', ''100'', ''0'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testAsIntegerRatioIsExact
	"as_integer_ratio() is exact by construction: the value IS
	mantissa/10^scale, so only the gcd has to be divided out.
	``Fraction(d)'' and ``Fraction.from_decimal(d)'' consume this."

	self assert: (self eval: '[ScaledDecimal("0.5").as_integer_ratio(),
 ScaledDecimal("1.50").as_integer_ratio(), ScaledDecimal("-0.25").as_integer_ratio(),
 ScaledDecimal("0").as_integer_ratio(), ScaledDecimal("123").as_integer_ratio(),
 ScaledDecimal(0.1).as_integer_ratio() == (0.1).as_integer_ratio()]' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[ScaledDecimal("1.5").is_nan(), ScaledDecimal("1.5").is_snan(),
 ScaledDecimal("1.5").is_qnan(), ScaledDecimal("1.5").is_infinite(),
 ScaledDecimal("1.5").is_finite(), ScaledDecimal("0.00").is_zero(),
 ScaledDecimal("1.5").is_zero(), ScaledDecimal("-1.5").is_signed(),
 ScaledDecimal("1.5").is_signed()]' with: { #ScaledDecimal -> ScaledDecimal })
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
        ScaledDecimal(lit)
        out.append("NO-RAISE")
    except ArithmeticError:
        out.append("ArithmeticError")
    except BaseException as ex:
        out.append("OTHER:" + type(ex).__name__)
out' with: { #ScaledDecimal -> ScaledDecimal })
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
        ScaledDecimal(v)
        out.append("NO-RAISE")
    except ArithmeticError:
        out.append("ArithmeticError")
out' with: { #ScaledDecimal -> ScaledDecimal })
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
            op(ScaledDecimal("1.5"), b)
            out.append("NO-RAISE")
        except TypeError:
            out.append("TypeError")
# A str operand: the same five, minus %.  ``ScaledDecimal % str'' reaches str''s
# __rmod__ (Python''s string-formatting operator), which Grail answers with
# a bare "Not yet implemented: __rmod__" that escapes except BaseException --
# a Str.gs gap, not a ScaledDecimal one, so it is left out rather than pinned here.
for op in ops[:5]:
    try:
        op(ScaledDecimal("1.5"), "a")
        out.append("NO-RAISE")
    except TypeError:
        out.append("TypeError")
[len(out), sorted(set(out))]' with: { #ScaledDecimal -> ScaledDecimal })
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
[ScaledDecimal("0.5") < 0.6, ScaledDecimal("0.5") == 0.5, ScaledDecimal("0.5") > 0.4,
 ScaledDecimal("0.5") == fractions.Fraction(1, 2),
 ScaledDecimal("0.5") < fractions.Fraction(3, 4),
 ScaledDecimal("2") == 2, ScaledDecimal("2") <= 2, ScaledDecimal("2") >= 2,
 ScaledDecimal("1.50") == ScaledDecimal("1.5"), ScaledDecimal("1.5") == "a",
 ScaledDecimal("1.5") != "a"]' with: { #ScaledDecimal -> ScaledDecimal })
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
        op(ScaledDecimal("1.5"), "a")
        out.append("NO-RAISE")
    except TypeError:
        out.append("TypeError")
out' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[str(ScaledDecimal()), str(ScaledDecimal("1.50", None)),
 str(ScaledDecimal(42, None))]' with: { #ScaledDecimal -> ScaledDecimal })
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

	self assert: (self eval: '[str(ScaledDecimal("1.50")), str(ScaledDecimal("1.500")),
 str(ScaledDecimal("1.50") + ScaledDecimal("0.005")),
 str(ScaledDecimal("1.50") - ScaledDecimal("0.50")),
 str(ScaledDecimal("1.50") * ScaledDecimal("1.00")),
 str(ScaledDecimal("1.5").quantize(ScaledDecimal("0.0001"))),
 str(ScaledDecimal("19.99") * 3), ScaledDecimal("1.50") == ScaledDecimal("1.5"),
 ScaledDecimal("1.50").as_tuple() == ScaledDecimal("1.5").as_tuple()]' with: { #ScaledDecimal -> ScaledDecimal })
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
for f in [lambda: ScaledDecimal("1") / ScaledDecimal("0"),
          lambda: ScaledDecimal("1") / 0,
          lambda: ScaledDecimal("1.5") / ScaledDecimal("0.00"),
          lambda: ScaledDecimal("1") // ScaledDecimal("0"),
          lambda: ScaledDecimal("1") // 0,
          lambda: ScaledDecimal("1") % ScaledDecimal("0"),
          lambda: ScaledDecimal("1") % ScaledDecimal("0.000"),
          lambda: ScaledDecimal("0") ** -1]:
    try:
        f()
        out.append("NO-RAISE")
    except ZeroDivisionError:
        out.append("ZeroDivisionError")
[len(out), sorted(set(out)), str(ScaledDecimal("0") / ScaledDecimal("2.5"))]' with: { #ScaledDecimal -> ScaledDecimal })
		@env1:__repr__
		equals: '[8, [''ZeroDivisionError''], ''0'']'
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testContextRoundingModeSeam
	"___setRounding___: is the second half of the context seam, and it
	reaches the same three places CPython's context rounding reaches: the
	round-to-precision step shared by division and power, and quantize's
	DEFAULT mode.

	2/3 is the value that shows it -- the exact expansion is 0.666...  so
	the last kept digit differs between every mode -- and 1.5 quantized to
	an integer is the tie that separates half-even from half-up.

	Held in SessionTemps for the same reason the precision is (ScaledDecimal
	is a kernel class), and restored in an #ensure: so a failure cannot
	leak a changed mode into the rest of the shard."

	| a b |
	a := ScaledDecimal ___new___: '2'.
	b := ScaledDecimal ___new___: '3'.
	[ScaledDecimal @env1:___setPrecision___: 5.
	 self assert: (a @env1:__truediv__: b) @env1:__str__ equals: '0.66667'.
	 self assert: (ScaledDecimal @env1:___rounding___) equals: 'ROUND_HALF_EVEN'.
	 ScaledDecimal @env1:___setRounding___: 'ROUND_DOWN'.
	 self assert: (a @env1:__truediv__: b) @env1:__str__ equals: '0.66666'.
	 self assert: ((ScaledDecimal ___new___: '1.5')
		@env1:quantize: (ScaledDecimal ___new___: '1')) @env1:__str__ equals: '1'.
	 ScaledDecimal @env1:___setRounding___: 'ROUND_HALF_UP'.
	 self assert: ((ScaledDecimal ___new___: '1.5')
		@env1:quantize: (ScaledDecimal ___new___: '1')) @env1:__str__ equals: '2'.
	 self assert: ((ScaledDecimal ___new___: '2.5')
		@env1:quantize: (ScaledDecimal ___new___: '1')) @env1:__str__ equals: '3'.
	 "an explicit mode still overrides the context one"
	 self assert: ((ScaledDecimal ___new___: '2.5')
		@env1:quantize: (ScaledDecimal ___new___: '1') _: 'ROUND_HALF_EVEN')
		@env1:__str__ equals: '2'.
	 self should: [ScaledDecimal @env1:___setRounding___: 'ROUND_SIDEWAYS']
		raise: TypeError.
	 self should: [ScaledDecimal @env1:___setPrecision___: 0]
		raise: ValueError]
		ensure: [
			ScaledDecimal @env1:___setPrecision___: 28.
			ScaledDecimal @env1:___setRounding___: 'ROUND_HALF_EVEN']
%

category: 'Grail-Tests - ScaledDecimal storage'
method: DecimalTestCase
testVmRangeCeilingsRaiseOverflowError
	"REGRESSION: two GemStone ceilings used to KILL THE PROCESS.

	Both are raw Smalltalk errors, so both escaped ``except BaseException''.
	Measured, one expression per process:
	  Decimal('1e50000')   -> NumericError 2503, 'an Integer would exceed
	                          130144 bits' (the positive-exponent clamp has
	                          to multiply the exponent out, so the
	                          coefficient outgrows a LargeInteger)
	  Decimal('1e-50000')  -> ImproperOperation 2723, 'invalid scale'
	                          (ScaledDecimal mantissa: 1 scale: 40000 fails
	                          where scale 30000 succeeds)

	The first is reachable ONLY through the positive-exponent clamp this
	work introduced -- before it, the literal did not construct at all --
	so guarding it is part of that clamp, not an unrelated hardening.

	OverflowError for both, which is how Grail already reports this class of
	VM limit (.claude/CLAUDE.md on test_format.test_common_format).  CPython
	has no ceiling on either axis and builds both values, so these are
	documented PLATFORM limits.

	The values just inside each ceiling are asserted alongside, because a
	guard that fires too early would be the worse bug: 1e5000 is a
	5001-character string and 1e-1000 round-trips as '1E-1000', and scale 30000 -- just inside the
	ceiling -- still constructs and prints."

	self assert: (self eval: 'out = []
for lit in ["1e50000", "1e-50000", "-1e50000"]:
    try:
        ScaledDecimal(lit)
        out.append("NO-RAISE")
    except OverflowError:
        out.append("OverflowError")
    except BaseException as ex:
        out.append("OTHER:" + type(ex).__name__)
[out, len(str(ScaledDecimal("1e5000"))), str(ScaledDecimal("1e-1000")),
 str(ScaledDecimal("1E+5")), str(ScaledDecimal("1e-30000"))]' with: { #ScaledDecimal -> ScaledDecimal })
		@env1:__repr__
		equals: '[[''OverflowError'', ''OverflowError'', ''OverflowError''], 5001, ''1E-1000'', ''100000'', ''1E-30000'']'
%
