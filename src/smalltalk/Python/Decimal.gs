! ===============================================================================
! ScaledDecimal (Python 'decimal.Decimal' type mapping)
! ===============================================================================
! This file adds Python methods to GemStone's ScaledDecimal class.
!
! STORAGE MODEL.  A ScaledDecimal is a COEFFICIENT and a DECIMAL EXPONENT, the
! same shape CPython's Decimal uses: instVarNames are #(mantissa scale) and the
! value is mantissa / 10^scale, so ``scale'' is the NEGATED CPython exponent.
! 3.14s4 stores mantissa 31400 and scale 4 and prints 3.1400 -- the trailing
! zeros are real, which is the whole reason this class can back decimal.Decimal
! where an exact RATIONAL (numerator/denominator) cannot: 1.50 and 1.5 are the
! same rational and different Decimals.
!
! Literals and #fromString: answer SmallScaledDecimal (a special encoding with
! no named instVars) and large values answer ScaledDecimal; both answer
! #mantissa and #scale, and #mantissa:scale: promotes between them
! transparently, so nothing here distinguishes the two.
!
! TWO THINGS THIS STORAGE CANNOT HOLD, both handled honestly rather than
! silently:
!   * NaN / sNaN / +-Infinity.  There is no encoding.  Constructing one raises
!     a catchable ArithmeticError instead of the uncatchable Smalltalk error
!     2185 that ``Decimal('nan')'' used to die with.  is_nan / is_infinite /
!     is_finite answer the question rather than pretending it cannot be asked.
!   * A POSITIVE exponent.  ScaledDecimal enforces scale >= 0, so CPython's
!     Decimal('1E+5') (coefficient 1, exponent +5) has no representation.  The
!     exponent is multiplied out into the coefficient, which keeps the VALUE
!     exact and loses only the exponent identity: str() answers '100000' where
!     CPython answers '1E+5'.  Before this file did that, ``Decimal('1E+5')''
!     did not construct at all -- ScaledDecimal fromString: died with ``illegal
!     trailing digit''.
!
! WHY THE ARITHMETIC IS NOT ALL DELEGATED.  ScaledDecimal's own #* # / and
! #raisedTo: round the result to max(scale), which CPython does not:
!   3.10s2 * 1.005s3   -> 3.116   (CPython: 3.11550 -- exponents ADD)
!   1.00s2 / 3.00s2    -> 0.33    (CPython: 28 significant digits)
!   1.5s1 raisedTo: 2  -> 2.2     (CPython: 2.25)
! So #__mul__:, #__truediv__: and #__pow__: do their own coefficient/exponent
! arithmetic here.  #+ and #- already take max(scale) exactly, which IS
! CPython's rule, so those two still delegate.
! ===============================================================================

! ------------------- Remove existing Python methods from Decimal
expectvalue /Metaclass3
doit
Decimal removeAllMethods: 1.
Decimal class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Internals -- coefficient/exponent plumbing
! ===============================================================================
! Named with the ___x___ convention on purpose: these are NOT CPython API, and
! plain #mantissa / #scale accessors would show up in dir(d) as a visible
! divergence.  They exist because neither piece is reachable from Python
! otherwise -- ``Decimal('1.50').mantissa'' is an AttributeError, and the class
! cannot even be NAMED from Python (a bare ``Decimal'' is a deliberate
! NameError, see PythonAst/NameAst.gs), so a Python layer reaches the class-side
! helpers as ``type(d).___fromParts___(m, s)''.

category: 'Grail-Decimal Internals'
method: Decimal
___parts___
	"{mantissa. scale} in one send rather than two."

	^ Array @env0:with: (self @env0:mantissa) with: (self @env0:scale)
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___fromParts___: mantissa _: scale
	"Build a Decimal from a coefficient and a NON-NEGATIVE scale.

	Sent to ``Decimal'' explicitly rather than to ``self'' so that a call
	arriving through ``type(d)'' -- the only class handle Python has -- still
	builds through ScaledDecimal class, which is what promotes between
	SmallScaledDecimal and ScaledDecimal by size.

	THE ONE GUARDED CHOKE POINT for construction: every Decimal this file
	builds -- from a string, from a float, from *, /, **, quantize or
	normalize -- arrives here, so the two VM ceilings only have to be
	resignalled once.  Both are raw Smalltalk errors that escape ``except
	BaseException'' and kill the gem, and both are reachable from ordinary
	Python code:

	  scale > ~30000     ImproperOperation 2723, 'invalid scale'
	                     measured: ScaledDecimal mantissa: 1 scale: 40000
	                     fails where scale 30000 succeeds, so
	                     ``Decimal('1e-50000')'' died
	  coefficient too    NumericError 2503, 'an Integer would exceed
	  large for a        130144 bits' -- measured via
	  LargeInteger       ``Decimal('1e50000')''

	OverflowError for both, which is how Grail already reports this class of
	VM limit (see .claude/CLAUDE.md on test_format.test_common_format, where
	a 123456-digit float string exceeds the LargeInteger ceiling and Grail
	raises OverflowError where CPython builds the string).  CPython has no
	such ceiling on either axis, so this is a documented platform limit, not
	a semantic choice."

	^ [Decimal @env0:mantissa: mantissa scale: scale]
		@env0:on: Error
		do: [:ex |
			((ex @env0:number @env0:= 2723) or: [ex @env0:number @env0:= 2503])
				ifTrue: [
					OverflowError ___signal___: 'Decimal is beyond GemStone''s'
						@env0:, ' ScaledDecimal range (scale '
						@env0:, (scale @env0:printString)
						@env0:, ', ' @env0:, ((Decimal ___digitCount___: mantissa) @env0:printString)
						@env0:, '-digit coefficient)']
				ifFalse: [ex @env0:pass]]
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___fromCoeff___: coeff _: exp
	"(coefficient, CPython decimal exponent) -> Decimal.

	exp <= 0 maps straight onto scale := 0 - exp.  A POSITIVE exp is
	multiplied out into the coefficient instead, because scale >= 0 is
	enforced by the class: the value stays exact and only the exponent
	identity is lost (see the file header)."

	(exp @env0:> 0) ifTrue: [
		"Multiplying the exponent out can exceed GemStone's LargeInteger
		ceiling, and that raises NumericError 2503 -- a raw Smalltalk error
		that escapes ``except BaseException''.  Measured:
		``Decimal('1e50000')'' died with ``Integer overflow, an Integer
		would exceed 130144 bits''.  Resignalled as OverflowError, the same
		way Grail already reports this VM limit elsewhere (see
		.claude/CLAUDE.md on test_format.test_common_format).  Reachable
		ONLY through this clamp, so it is bounded by it: without the clamp
		the literal did not construct at all."
		^ Decimal
			___fromParts___: ([coeff @env0:* (10 @env0:raisedTo: exp)]
				@env0:on: Error
				do: [:ex |
					(ex @env0:number @env0:= 2503)
						ifTrue: [
							OverflowError ___signal___:
								'Decimal exponent +' @env0:, (exp @env0:printString)
								@env0:, ' needs a coefficient beyond GemStone''s'
								@env0:, ' LargeInteger ceiling: ScaledDecimal cannot hold'
								@env0:, ' a positive exponent, so it must be multiplied out']
						ifFalse: [ex @env0:pass]])
			_: 0].
	^ Decimal ___fromParts___: coeff _: (exp @env0:negated)
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___zeros___: n
	"A String of n '0' characters ('' for n <= 0).

	10^n prints as '1' followed by n zeros, so dropping the leading '1' is
	the whole construction.  #new:withAll: is not available on String class
	in this image (measured: doesNotUnderstand)."

	(n @env0:<= 0) ifTrue: [^ ''].
	^ ((10 @env0:raisedTo: n) @env0:printString) @env0:copyFrom: 2 to: (n @env0:+ 1)
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___digitCount___: n
	"Number of decimal digits in |n|.  Zero has one digit, as CPython's
	coefficient '0' does."

	^ ((n @env0:abs) @env0:printString) @env0:size
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___precision___
	"Context precision -- the number of significant digits a division or a
	power is rounded to.

	Held in SessionTemps rather than on the class because ScaledDecimal is a
	GemStone KERNEL class with nowhere to put it, and because a context is a
	per-session notion anyway.  28 is CPython's default.  The Python layer
	drives this through ___setPrecision___:, which is the ONE seam between
	decimal.py's Context and this file."

	| p |
	p := (SessionTemps @env0:current)
		@env0:at: #'GrailDecimalPrecision' otherwise: nil.
	(p @env0:== nil) ifTrue: [^ 28].
	^ p
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___setPrecision___: n
	"Set the context precision (see ___precision___).  Answers n."

	((n isKindOf: Integer) and: [n @env0:>= 1]) ifFalse: [
		^ ValueError ___signal___: 'prec must be an integer >= 1'].
	(SessionTemps @env0:current) @env0:at: #'GrailDecimalPrecision' put: n.
	^ n
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___rounding___
	"Context rounding mode, as one of CPython's ROUND_* strings.
	ROUND_HALF_EVEN is CPython's default and the General Decimal Arithmetic
	default."

	| r |
	r := (SessionTemps @env0:current)
		@env0:at: #'GrailDecimalRounding' otherwise: nil.
	(r @env0:== nil) ifTrue: [^ 'ROUND_HALF_EVEN'].
	^ r
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___setRounding___: mode
	"Set the context rounding mode (see ___rounding___).  Answers mode."

	(Decimal ___knownRounding___: mode) ifFalse: [
		^ TypeError ___signal___: 'invalid rounding mode'].
	(SessionTemps @env0:current)
		@env0:at: #'GrailDecimalRounding' put: (mode @env0:asString).
	^ mode
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___knownRounding___: mode
	"Is mode one of the eight ROUND_* modes?"

	| n |
	(mode @env0:== nil) ifTrue: [^ false].
	(mode @env0:___isPyStr___) ifFalse: [^ false].
	n := mode @env0:asString.
	^ #('ROUND_DOWN' 'ROUND_UP' 'ROUND_CEILING' 'ROUND_FLOOR'
		'ROUND_HALF_UP' 'ROUND_HALF_DOWN' 'ROUND_HALF_EVEN' 'ROUND_05UP')
			@env0:includes: n
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___roundQuot___: n by: d mode: mode negative: neg
	"n // d rounded per `mode`, for NON-NEGATIVE n and POSITIVE d.

	The sign is carried separately in `neg` because half the modes are
	sign-sensitive (CEILING and FLOOR) while the arithmetic here is on
	magnitudes.  Every tie test is exact -- 2*r against d, never a division."

	| q r twice |
	q := n @env0:// d.
	r := n @env0:- (q @env0:* d).
	(r @env0:= 0) ifTrue: [^ q].
	(mode @env0:= 'ROUND_DOWN') ifTrue: [^ q].
	(mode @env0:= 'ROUND_UP') ifTrue: [^ q @env0:+ 1].
	(mode @env0:= 'ROUND_CEILING') ifTrue: [
		neg ifTrue: [^ q]. ^ q @env0:+ 1].
	(mode @env0:= 'ROUND_FLOOR') ifTrue: [
		neg ifTrue: [^ q @env0:+ 1]. ^ q].
	(mode @env0:= 'ROUND_05UP') ifTrue: [
		(((q @env0:\\ 10) @env0:= 0) or: [(q @env0:\\ 10) @env0:= 5])
			ifTrue: [^ q @env0:+ 1].
		^ q].
	twice := r @env0:* 2.
	(mode @env0:= 'ROUND_HALF_UP') ifTrue: [
		(twice @env0:>= d) ifTrue: [^ q @env0:+ 1]. ^ q].
	(mode @env0:= 'ROUND_HALF_DOWN') ifTrue: [
		(twice @env0:> d) ifTrue: [^ q @env0:+ 1]. ^ q].
	"ROUND_HALF_EVEN, the default"
	(twice @env0:> d) ifTrue: [^ q @env0:+ 1].
	((twice @env0:= d) and: [(q @env0:\\ 2) @env0:~= 0])
		ifTrue: [^ q @env0:+ 1].
	^ q
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___fixCoeff___: coeff _: exp
	"Round (coefficient, exponent) to the context precision, answering
	{coefficient. exponent}.  CPython's Decimal._fix, minus the Emin/Emax
	clamping this storage has no exponent range to need.

	A coefficient already within precision is returned untouched, which is
	what keeps an exact result exact."

	| prec neg a len drop divisor q e |
	prec := Decimal ___precision___.
	neg := coeff @env0:< 0.
	a := coeff @env0:abs.
	len := (a @env0:printString) @env0:size.
	(len @env0:<= prec) ifTrue: [^ Array @env0:with: coeff with: exp].
	drop := len @env0:- prec.
	divisor := 10 @env0:raisedTo: drop.
	q := Decimal
		___roundQuot___: a
		by: divisor
		mode: (Decimal ___rounding___)
		negative: neg.
	e := exp @env0:+ drop.
	"A carry can push the coefficient back to prec+1 digits -- 9995 at
	prec 3 rounds to 1000 -- so strip the extra digit and bump the exponent."
	(((q @env0:printString) @env0:size) @env0:> prec) ifTrue: [
		q := q @env0:// 10.
		e := e @env0:+ 1].
	neg ifTrue: [q := q @env0:negated].
	^ Array @env0:with: q with: e
%

category: 'Grail-Decimal Internals'
classmethod: Decimal
___isZero___: operand
	"Is an already-coerced arithmetic operand (an Integer or a Decimal)
	zero?

	Asked before the env-0 #// and #\\ delegations because a zero divisor
	there raises GemStone's ZeroDivide (error 2026,
	numErrIntDivisionByZero), which is a raw Smalltalk error and escapes
	``except BaseException'' -- measured: ``Decimal('1') // Decimal('0')''
	and ``Decimal('1') % Decimal('0')'' both terminated the interpreter.
	__truediv__: and __pow__: never needed this because they do their own
	coefficient arithmetic and check the divisor themselves."

	(operand _isScaledDecimal) ifTrue: [^ (operand @env0:mantissa) @env0:= 0].
	^ operand @env0:= 0
%

category: 'Grail-Decimal Internals'
method: Decimal
___arithOperand___: other
	"The operand an ARITHMETIC dunder will accept, coerced to an Integer or
	a Decimal -- or nil, meaning ``fall through to ___binOpFallback___''.

	NARROWER than #845's ``isKindOf: Number'' guard, deliberately.  int and
	Decimal only, plus anything answering __index__ (the same fast path
	Int.gs and Float.gs keep).  A Float or a Fraction operand is REFUSED
	here so that it raises a Python TypeError, because:
	  Decimal('1.5') + 1.0        is a TypeError in CPython
	  Decimal('1.5') + Fraction() is a TypeError in CPython, asserted in
	    both directions by test_fractions' testMixingWithDecimal
	while ScaledDecimal's generality coercion silently answered a Float for
	the first and a Fraction for the second -- a wrong TYPE rather than an
	error, which is the failure mode that hides.

	COMPARISONS stay wide (see __eq__ / __lt__): CPython splits
	_convert_other for arithmetic from _convert_for_comparison for ordering,
	and ``Decimal('0.5') < 0.6'' is perfectly legal.

	The guard also has to exist at all, for the reason #845 measured: an
	unguarded env-0 send hands a non-Number operand to GemStone's Number
	generality coercion, which sends env-0 #_generality to it; a
	PythonInstance answers DNU only in env 1, so the miss escaped as an
	UNCATCHABLE Smalltalk MessageNotUnderstood that no Python ``except''
	could see."

	(other _isScaledDecimal) ifTrue: [^ other].
	(other isKindOf: Integer) ifTrue: [^ other].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [^ other __index__].
	^ nil
%

category: 'Grail-Decimal Internals'
method: Decimal
___operandParts___: other
	"{mantissa. scale} for an operand arithmetic accepts, else nil.
	An Integer has coefficient itself and scale 0."

	| o |
	o := self ___arithOperand___: other.
	(o @env0:== nil) ifTrue: [^ nil].
	(o _isScaledDecimal) ifTrue: [
		^ Array @env0:with: (o @env0:mantissa) with: (o @env0:scale)].
	^ Array @env0:with: o with: 0
%

! ===============================================================================
! Identity
! ===============================================================================

category: 'Grail-Attribute Access'
method: Decimal
__class__
	"Answer ScaledDecimal for BOTH backing classes, so ``type(d)'' and
	``type(d).__name__'' say the same thing for a small and a large value.

	This is the normalising hook type() actually asks: object >>
	___pyMetaclass___ routes a non-class receiver through __class__ for
	exactly this reason, and the integer, float, bytearray and dict-view
	families all override it the same way.  Without it, ``type(Decimal(
	'1.50')).__name__'' answered 'SmallScaledDecimal' -- measured -- because
	Object.gs's type-name table lists only 'ScaledDecimal' and every literal
	and every #fromString: result is a SmallScaledDecimal.  It also makes
	``type(d) is Decimal'' true, which is what test_math's
	``type(prod([...])) == decimal.Decimal'' compares."

	^ Decimal
%

! ===============================================================================
! Instance creation
! ===============================================================================

category: 'Grail-Instance Creation'
classmethod: Decimal
__new__
	"Decimal() -- CPython's zero-argument form, which answers Decimal('0')."

	^ Decimal ___fromParts___: 0 _: 0
%

category: 'Grail-Instance Creation'
classmethod: Decimal
__new__: value
	"Decimal(value).  Receiver IS the class.

	Construction is done HERE from a coefficient and a scale rather than
	through ScaledDecimal's own converters, for two measured reasons:

	  * #fromString: rejects exponent notation and every special-value
	    spelling, and BOTH escaped as uncatchable Smalltalk errors that
	    ``except BaseException'' could not see:
	      Decimal('1E+5') -> 'illegal trailing digit'
	      Decimal('nan')  -> ImproperOperation 2185, rtErrBadFormat
	      Decimal('abc')  -> ImproperOperation 2185, rtErrBadFormat
	    The first is a value ScaledDecimal can hold perfectly well; the
	    other two are not, and now say so catchably.

	  * ``for: aFloat scale: 28'' is INEXACT, and CPython's Decimal(float)
	    is exact -- Decimal(0.1) is the full 55-digit expansion of the
	    double.  Exactness costs nothing here: a finite float's value is
	    m/2^k, and m/2^k = (m*5^k)/10^k is always a terminating decimal."

	(value @env0:== nil) ifTrue: [^ Decimal ___fromParts___: 0 _: 0].
	(value _isScaledDecimal) ifTrue: [^ value].
	(value isKindOf: Integer) ifTrue: [^ Decimal ___fromParts___: value _: 0].
	(value isKindOf: Float) ifTrue: [^ Decimal ___fromFloat___: value].
	(value @env0:___isPyStr___) ifTrue: [
		^ Decimal ___fromDecimalString___: (value @env0:___pyPlainStr___)].
	^ TypeError ___signal___: ('conversion from '
		@env0:, (value @env0:class @env0:name @env0:asString)
		@env0:, ' to Decimal is not supported')
%

category: 'Grail-Instance Creation'
classmethod: Decimal
__new__: value _: context
	"Decimal(value, context) -- CPython accepts a context argument here and
	uses it only to report a conversion error through.  Accepted and
	ignored, as the pure-Python module before this also did (twilio passes
	one)."

	^ Decimal __new__: value
%

category: 'Grail-Instance Creation'
classmethod: Decimal
___fromFloat___: aFloat
	"A finite float's EXACT value as a Decimal.

	#asFraction on a Float is exact in this image (measured: 0.1 asFraction
	is 3602879701896397/36028797018963968), and the denominator is always a
	power of two, so k = highBit - 1 and mantissa := numerator * 5^k over
	scale k is the exact terminating decimal.  An integral float answers an
	Integer from #asFraction rather than a Fraction, hence the first test."

	| kind r n d k |
	kind := aFloat @env0:_getKind.
	((kind @env0:= 3) or: [kind @env0:= 5]) ifTrue: [
		^ ArithmeticError ___signal___: 'cannot convert '
			@env0:, (aFloat @env0:printString)
			@env0:, ' to Decimal: ScaledDecimal has no Infinity or NaN encoding'].
	r := aFloat @env0:asFraction.
	(r isKindOf: Integer) ifTrue: [^ Decimal ___fromParts___: r _: 0].
	n := r @env0:numerator.
	d := r @env0:denominator.
	k := (d @env0:highBit) @env0:- 1.
	^ Decimal ___fromParts___: (n @env0:* (5 @env0:raisedTo: k)) _: k
%

category: 'Grail-Instance Creation'
classmethod: Decimal
___fromDecimalString___: aString
	"Parse a CPython Decimal string literal: optional sign, digits with an
	optional '.', an optional 'e'/'E' exponent, PEP 515 underscores, and
	surrounding whitespace.

	Parsed here rather than by #fromString: because #fromString: rejects
	exponent notation outright and dies UNCATCHABLY on anything malformed
	(see __new__:).  The exponent is folded into the coefficient/scale pair,
	so '1.5e3' and '1500' land on the same value."

	| s size i neg ch ws digits fracLen sawDigit sawDot sawExp expNeg expVal
	  coeff rest |
	(aString @env0:== nil) ifTrue: [^ Decimal ___badLiteral___: 'None'].
	s := (aString @env0:asString) @env0:trimSeparators.
	size := s @env0:size.
	(size @env0:= 0) ifTrue: [^ Decimal ___badLiteral___: aString].
	i := 1.
	neg := false.
	ch := s @env0:at: 1.
	(ch @env0:== $-) ifTrue: [neg := true. i := 2].
	(ch @env0:== $+) ifTrue: [i := 2].
	"NaN / sNaN / Infinity have no encoding here.  Refuse them by NAME, with
	a catchable error, rather than letting #fromString: kill the process."
	rest := (s @env0:copyFrom: i to: size) @env0:asLowercase.
	(#('nan' 'snan' 'inf' 'infinity') @env0:includes: rest) ifTrue: [
		^ ArithmeticError ___signal___: 'Decimal('''
			@env0:, (s @env0:asString)
			@env0:, ''') is not representable: ScaledDecimal has no Infinity or NaN encoding'].
	ws := WriteStream @env0:on: String @env0:new.
	fracLen := 0.
	sawDigit := false.
	sawDot := false.
	sawExp := false.
	expNeg := false.
	expVal := 0.
	[i @env0:<= size] whileTrue: [
		ch := s @env0:at: i.
		(ch @env0:isDigit)
			ifTrue: [
				sawDigit := true.
				sawExp
					ifTrue: [expVal := (expVal @env0:* 10) @env0:+ (ch @env0:digitValue)]
					ifFalse: [
						ws @env0:nextPut: ch.
						sawDot ifTrue: [fracLen := fracLen @env0:+ 1]]]
			ifFalse: [
				(ch @env0:== $.)
					ifTrue: [
						(sawDot or: [sawExp])
							ifTrue: [^ Decimal ___badLiteral___: s].
						sawDot := true]
					ifFalse: [
						((ch @env0:== $e) or: [ch @env0:== $E])
							ifTrue: [
								(sawExp or: [sawDigit @env0:not])
									ifTrue: [^ Decimal ___badLiteral___: s].
								sawExp := true.
								"the exponent needs its own digits, so forget the
								mantissa's -- an 'e' with nothing after it is malformed"
								sawDigit := false.
								(i @env0:< size) ifTrue: [
									ch := s @env0:at: (i @env0:+ 1).
									(ch @env0:== $-) ifTrue: [
										expNeg := true. i := i @env0:+ 1].
									(ch @env0:== $+) ifTrue: [i := i @env0:+ 1]]]
							ifFalse: [
								(ch @env0:== $_)
									ifFalse: [^ Decimal ___badLiteral___: s]]]].
		i := i @env0:+ 1].
	sawDigit ifFalse: [^ Decimal ___badLiteral___: s].
	digits := ws @env0:contents.
	(digits @env0:size @env0:= 0) ifTrue: [^ Decimal ___badLiteral___: s].
	coeff := digits @env0:asInteger.
	(coeff @env0:== nil) ifTrue: [^ Decimal ___badLiteral___: s].
	neg ifTrue: [coeff := coeff @env0:negated].
	expNeg ifTrue: [expVal := expVal @env0:negated].
	"value = coeff * 10^(expVal - fracLen)"
	^ Decimal ___fromCoeff___: coeff _: (expVal @env0:- fracLen)
%

category: 'Grail-Instance Creation'
classmethod: Decimal
___badLiteral___: aString
	"A malformed literal.

	ArithmeticError, not ValueError: CPython raises decimal.InvalidOperation,
	which IS an ArithmeticError subclass, so ``except ArithmeticError''
	behaves identically here and in CPython.  It cannot be the real
	InvalidOperation because that class is defined in decimal.py and a Python
	module attribute is not reachable from Smalltalk -- wiring it is one line
	in whichever Python layer ends up owning the module, and this is the seam
	it goes through.  What matters now is that it is CATCHABLE at all: before
	this, a malformed literal was Smalltalk error 2185 and killed the
	process."

	^ ArithmeticError ___signal___: 'invalid literal for Decimal: '''
		@env0:, (aString @env0:asString) @env0:, ''''
%

! ===============================================================================
! String representation
! ===============================================================================

category: 'Grail-String Representation'
method: Decimal
__str__
	"CPython's to-scientific-string, rendered from the coefficient and the
	exponent directly.

	NOT ``self asString'' and NOT a route through float, for three separate
	reasons:
	  * asString prints scale 0 with a trailing point -- ScaledDecimal
	    mantissa: 100 scale: 0 prints '100.' where CPython says '100'.
	  * a route through float loses the trailing zeros that are the entire
	    point of this backing class, and rounds anything past 17 digits.
	  * CPython switches to exponent notation when adjusted < -6, which no
	    fixed-point rendering can produce: Decimal('1e-7') is '1E-7'.

	adjusted = len(digits) - 1 + exponent, and exponent = 0 - scale is never
	positive here, so the exponent-notation branch is reached only from
	below."

	| m s digits exp adjusted body |
	m := self @env0:mantissa.
	s := self @env0:scale.
	digits := (m @env0:abs) @env0:printString.
	exp := s @env0:negated.
	adjusted := ((digits @env0:size) @env0:- 1) @env0:+ exp.
	(exp @env0:= 0)
		ifTrue: [body := digits]
		ifFalse: [
			(adjusted @env0:>= -6)
				ifTrue: [
					(adjusted @env0:>= 0)
						ifTrue: [
							body := ((digits @env0:copyFrom: 1 to: (adjusted @env0:+ 1))
								@env0:, '.')
								@env0:, (digits
									@env0:copyFrom: (adjusted @env0:+ 2)
									to: (digits @env0:size))]
						ifFalse: [
							body := ('0.'
								@env0:, (Decimal ___zeros___: ((adjusted @env0:negated) @env0:- 1)))
								@env0:, digits]]
				ifFalse: [
					body := digits @env0:copyFrom: 1 to: 1.
					((digits @env0:size) @env0:> 1) ifTrue: [
						body := (body @env0:, '.')
							@env0:, (digits @env0:copyFrom: 2 to: (digits @env0:size))].
					body := ((body @env0:, 'E')
						@env0:, ((adjusted @env0:>= 0) ifTrue: ['+'] ifFalse: ['-']))
						@env0:, ((adjusted @env0:abs) @env0:printString)]].
	(m @env0:< 0) ifTrue: [^ '-' @env0:, body].
	^ body
%

category: 'Grail-String Representation'
method: Decimal
__repr__
	"Decimal('...'), quoting the same string __str__ answers."

	^ ('Decimal(''' @env0:, (self __str__)) @env0:, ''')'
%

! ===============================================================================
! Conversion
! ===============================================================================

category: 'Grail-Conversion'
method: Decimal
__float__
	"Convert to float"
	^ self @env0:asFloat
%

category: 'Grail-Conversion'
method: Decimal
__int__
	"Truncate toward zero, as CPython's int(Decimal) does."
	^ self @env0:truncated
%

category: 'Grail-Conversion'
method: Decimal
__bool__
	"Only a zero coefficient is falsey."
	^ (self @env0:mantissa) @env0:~= 0
%

category: 'Grail-Conversion'
method: Decimal
as_integer_ratio
	"The exact value as a coprime (numerator, denominator) pair with a
	positive denominator.  Exact by construction: the value IS
	mantissa/10^scale, so only the gcd has to be divided out.
	``Fraction(d)'' and ``Fraction.from_decimal(d)'' consume this."

	| m d g |
	m := self @env0:mantissa.
	d := 10 @env0:raisedTo: (self @env0:scale).
	g := (m @env0:abs) @env0:gcd: d.
	(g @env0:= 0) ifTrue: [g := 1].
	^ tuple @env0:withAll: {m @env0:// g. d @env0:// g}
%

! ===============================================================================
! Coefficient / exponent introspection
! ===============================================================================

category: 'Grail-Decimal Introspection'
method: Decimal
as_tuple
	"(sign, digits, exponent), as CPython's DecimalTuple -- which compares
	equal to a plain tuple, so a plain tuple is what this answers.
	Decimal('1.50').as_tuple() is (0, (1, 5, 0), -2)."

	| m ds digits |
	m := self @env0:mantissa.
	ds := (m @env0:abs) @env0:printString.
	digits := Array @env0:new: (ds @env0:size).
	1 @env0:to: (ds @env0:size) do: [:i |
		digits @env0:at: i put: ((ds @env0:at: i) @env0:digitValue)].
	^ tuple @env0:withAll: {
		(m @env0:< 0) ifTrue: [1] ifFalse: [0].
		tuple @env0:withAll: digits.
		(self @env0:scale) @env0:negated}
%

category: 'Grail-Decimal Introspection'
method: Decimal
adjusted
	"The exponent of the most significant digit: len(digits) - 1 + exponent.
	Decimal('0.000001').adjusted() is -6."

	^ (((Decimal ___digitCount___: (self @env0:mantissa)) @env0:- 1))
		@env0:- (self @env0:scale)
%

category: 'Grail-Decimal Introspection'
method: Decimal
normalize
	"Strip trailing zeros from the coefficient, as CPython's normalize does:
	Decimal('1.50').normalize() is Decimal('1.5').

	It stops at scale 0, because going further needs a POSITIVE exponent
	this storage cannot hold -- CPython's Decimal('100').normalize() is
	Decimal('1E+2') and this answers Decimal('100'), the same value."

	| m s |
	m := self @env0:mantissa.
	s := self @env0:scale.
	(m @env0:= 0) ifTrue: [^ Decimal ___fromParts___: 0 _: 0].
	[(s @env0:> 0) and: [(m @env0:\\ 10) @env0:= 0]] whileTrue: [
		m := m @env0:// 10.
		s := s @env0:- 1].
	^ Decimal ___fromParts___: m _: s
%

category: 'Grail-Decimal Introspection'
method: Decimal
quantize: other
	"Rescale to the exponent of `other`, rounding per the context mode."

	^ self ___quantizeTo___: other rounding: (Decimal ___rounding___)
%

category: 'Grail-Decimal Introspection'
method: Decimal
quantize: other _: rounding
	"Rescale to the exponent of `other`, rounding per `rounding` (one of the
	ROUND_* strings; None means the context mode)."

	| mode |
	(rounding @env0:== nil)
		ifTrue: [mode := Decimal ___rounding___]
		ifFalse: [
			(Decimal ___knownRounding___: rounding) ifFalse: [
				^ TypeError ___signal___: 'invalid rounding mode'].
			mode := rounding @env0:asString].
	^ self ___quantizeTo___: other rounding: mode
%

category: 'Grail-Decimal Internals'
method: Decimal
___quantizeTo___: other rounding: mode
	"The one implementation both #quantize: arities use.

	Scaling UP is exact (multiply the coefficient); scaling DOWN rounds.
	This is the operation that gives a fixed number of decimal places
	without going near a float: Decimal('2.675').quantize(Decimal('0.01'))
	is Decimal('2.68')."

	| ts m s divisor neg q |
	(other _isScaledDecimal) ifFalse: [
		^ TypeError ___signal___: 'quantize() argument must be a Decimal'].
	ts := other @env0:scale.
	m := self @env0:mantissa.
	s := self @env0:scale.
	(ts @env0:>= s) ifTrue: [
		^ Decimal
			___fromParts___: (m @env0:* (10 @env0:raisedTo: (ts @env0:- s)))
			_: ts].
	divisor := 10 @env0:raisedTo: (s @env0:- ts).
	neg := m @env0:< 0.
	q := Decimal
		___roundQuot___: (m @env0:abs) by: divisor mode: mode negative: neg.
	neg ifTrue: [q := q @env0:negated].
	^ Decimal ___fromParts___: q _: ts
%

! ===============================================================================
! Special-value predicates
! ===============================================================================
! All three answer a constant, and that IS the honest answer: ScaledDecimal has
! no NaN and no Infinity encoding, so a Decimal reaching this file is finite by
! construction (constructing anything else raises -- see __new__:).  They exist
! so that code written against CPython's decimal can ASK, instead of getting an
! AttributeError.

category: 'Grail-Decimal Introspection'
method: Decimal
is_nan
	"False, always: this storage has no NaN encoding."
	^ false
%

category: 'Grail-Decimal Introspection'
method: Decimal
is_snan
	"False, always: this storage has no signalling-NaN encoding."
	^ false
%

category: 'Grail-Decimal Introspection'
method: Decimal
is_qnan
	"False, always: this storage has no quiet-NaN encoding."
	^ false
%

category: 'Grail-Decimal Introspection'
method: Decimal
is_infinite
	"False, always: this storage has no Infinity encoding."
	^ false
%

category: 'Grail-Decimal Introspection'
method: Decimal
is_finite
	"True, always -- see the section comment."
	^ true
%

category: 'Grail-Decimal Introspection'
method: Decimal
is_zero
	"Is the coefficient zero?"
	^ (self @env0:mantissa) @env0:= 0
%

category: 'Grail-Decimal Introspection'
method: Decimal
is_signed
	"Is the sign bit set?  A negative-zero Decimal is not representable
	here, so this is simply ``coefficient < 0''."
	^ (self @env0:mantissa) @env0:< 0
%

! ===============================================================================
! Arithmetic
! ===============================================================================

category: 'Grail-Arithmetic'
method: Decimal
__abs__
	"Absolute value"
	^ self @env0:abs
%

category: 'Grail-Arithmetic'
method: Decimal
__neg__
	"Negate"
	^ self @env0:negated
%

category: 'Grail-Arithmetic'
method: Decimal
__pos__
	"Unary plus"
	^ self
%

category: 'Grail-Arithmetic'
method: Decimal
__add__: other
	"Add.  DELEGATED: ScaledDecimal's #+ already takes max(scale) exactly,
	which IS CPython's rule (the result exponent is the MINIMUM of the two,
	i.e. the maximum scale), so there is nothing to correct.

	Only the guard changes from #845's: see ___arithOperand___: for why a
	Float or Fraction operand must raise TypeError here rather than being
	coerced."

	| o |
	o := self ___arithOperand___: other.
	(o @env0:== nil) ifFalse: [^ self @env0:+ o].
	^ self ___binOpFallback___: other op: '+' reflected: #'__radd__:'
%

category: 'Grail-Arithmetic'
method: Decimal
__sub__: other
	"Subtract.  Delegated for the same reason as __add__:."

	| o |
	o := self ___arithOperand___: other.
	(o @env0:== nil) ifFalse: [^ self @env0:- o].
	^ self ___binOpFallback___: other op: '-' reflected: #'__rsub__:'
%

category: 'Grail-Arithmetic'
method: Decimal
__mul__: other
	"Multiply, EXACTLY: coefficients multiply and exponents ADD.

	NOT delegated.  ScaledDecimal's own #* rounds to max(scale) -- measured
	on this image: 3.10s2 * 1.005s3 answers 3.116 where CPython answers
	3.11550, and 1.50s2 * 1.50s2 rounds where CPython answers 2.2500.  An
	int operand has scale 0, so int multiplication is unaffected either way
	(10.5s1 * 2 is 21.0 under both rules)."

	| p |
	p := self ___operandParts___: other.
	(p @env0:== nil) ifFalse: [
		^ Decimal
			___fromParts___: ((self @env0:mantissa) @env0:* (p @env0:at: 1))
			_: ((self @env0:scale) @env0:+ (p @env0:at: 2))].
	^ self ___binOpFallback___: other op: '*' reflected: #'__rmul__:'
%

category: 'Grail-Arithmetic'
method: Decimal
__truediv__: other
	"Divide, honouring the CONTEXT PRECISION rather than max(scale).

	NOT delegated.  ScaledDecimal's #/ rounds to max(scale) -- measured:
	1.00s2 / 3.00s2 answers 0.33, where CPython gives 28 significant
	digits -- which makes every quotient's accuracy depend on how the
	operands happened to be spelled.

	This is CPython's divide, step for step:
	  shift = digits(b) - digits(a) + prec + 1
	  exp   = exp1 - exp2 - shift                (exp_n = -scale_n)
	  coeff, rem = divmod(a * 10^shift, b)
	  rem == 0 -> EXACT: strip trailing zeros back toward the ideal
	              exponent exp1 - exp2, so 10.0/4.0 is 2.5 and not
	              2.5000000...
	  rem != 0 -> INEXACT: make the discarded remainder STICKY by bumping a
	              coefficient ending in 5, so the round-to-precision below
	              cannot mistake a truncated value for an exact tie
	then round the coefficient to `prec` digits (___fixCoeff___:_:).

	Division by zero raises ZeroDivisionError rather than CPython's
	DivisionByZero/InvalidOperation split, matching what the Python layer
	already raises; DivisionByZero there IS a ZeroDivisionError subclass, so
	one ``except ZeroDivisionError'' catches both."

	| p m1 s1 m2 s2 neg a b prec shift e num den coeff rem ideal fixed |
	p := self ___operandParts___: other.
	(p @env0:== nil) ifTrue: [
		^ self ___binOpFallback___: other op: '/' reflected: #'__rtruediv__:'].
	m1 := self @env0:mantissa.
	s1 := self @env0:scale.
	m2 := p @env0:at: 1.
	s2 := p @env0:at: 2.
	(m2 @env0:= 0) ifTrue: [
		^ ZeroDivisionError ___signal___: 'division by zero'].
	(m1 @env0:= 0) ifTrue: [^ Decimal ___fromParts___: 0 _: 0].
	neg := (m1 @env0:< 0) @env0:~= (m2 @env0:< 0).
	a := m1 @env0:abs.
	b := m2 @env0:abs.
	prec := Decimal ___precision___.
	shift := (((Decimal ___digitCount___: b) @env0:- (Decimal ___digitCount___: a))
		@env0:+ prec) @env0:+ 1.
	e := (s2 @env0:- s1) @env0:- shift.
	(shift @env0:>= 0)
		ifTrue: [
			num := a @env0:* (10 @env0:raisedTo: shift).
			den := b]
		ifFalse: [
			num := a.
			den := b @env0:* (10 @env0:raisedTo: (shift @env0:negated))].
	coeff := num @env0:// den.
	rem := num @env0:- (coeff @env0:* den).
	(rem @env0:= 0)
		ifTrue: [
			ideal := s2 @env0:- s1.
			[(e @env0:< ideal) and: [(coeff @env0:\\ 10) @env0:= 0]]
				whileTrue: [
					coeff := coeff @env0:// 10.
					e := e @env0:+ 1]]
		ifFalse: [
			((coeff @env0:\\ 5) @env0:= 0) ifTrue: [coeff := coeff @env0:+ 1]].
	neg ifTrue: [coeff := coeff @env0:negated].
	fixed := Decimal ___fixCoeff___: coeff _: e.
	^ Decimal ___fromCoeff___: (fixed @env0:at: 1) _: (fixed @env0:at: 2)
%

category: 'Grail-Arithmetic'
method: Decimal
__pow__: exponent
	"Raise to an INTEGER power, exactly: the coefficient is raised and the
	scale is multiplied, then the coefficient is rounded to the context
	precision.

	NOT delegated.  ScaledDecimal's #raisedTo: rounds to the receiver's own
	scale -- measured: 1.5s1 raisedTo: 2 answers 2.2 where CPython answers
	2.25.

	A NEGATIVE exponent goes through __truediv__:, so it picks up the
	context precision (Decimal(2) ** -1 is 0.5).  A FRACTIONAL exponent is
	REFUSED rather than approximated: it needs a general power this storage
	cannot give exactly, and answering a rounded number silently would be
	worse than a TypeError."

	| n m s fixed |
	n := nil.
	(exponent isKindOf: Integer) ifTrue: [n := exponent].
	((n @env0:== nil) and: [exponent _isScaledDecimal]) ifTrue: [
		((exponent @env0:scale) @env0:= 0) ifTrue: [n := exponent @env0:mantissa]].
	(n @env0:== nil) ifTrue: [
		^ self ___binOpFallback___: exponent op: '**' reflected: #'__rpow__:'].
	(n @env0:>= 0) ifTrue: [
		m := (self @env0:mantissa) @env0:raisedTo: n.
		s := (self @env0:scale) @env0:* n.
		fixed := Decimal ___fixCoeff___: m _: (s @env0:negated).
		^ Decimal ___fromCoeff___: (fixed @env0:at: 1) _: (fixed @env0:at: 2)].
	((self @env0:mantissa) @env0:= 0) ifTrue: [
		^ ZeroDivisionError ___signal___: '0 ** negative is not defined'].
	^ (Decimal ___fromParts___: 1 _: 0) __truediv__: (self __pow__: (n @env0:negated))
%

category: 'Grail-Arithmetic'
method: Decimal
__floordiv__: other
	"Floor division.

	Semantics UNCHANGED from #845 (GemStone's #// floors), only the guard is
	narrowed -- see ___arithOperand___:.  CPython's Decimal TRUNCATES toward
	zero instead, so Decimal(-7) // Decimal(2) is -3 there and -4 here; that
	divergence predates this file's rewrite and is recorded rather than
	quietly changed, because it is a separate behaviour change from the ones
	this issue asked for."

	| o |
	o := self ___arithOperand___: other.
	(o @env0:== nil) ifFalse: [
		(Decimal ___isZero___: o) ifTrue: [
			^ ZeroDivisionError ___signal___: 'division by zero'].
		^ self @env0:// o].
	^ self ___binOpFallback___: other op: '//' reflected: #'__rfloordiv__:'
%

category: 'Grail-Arithmetic'
method: Decimal
__mod__: other
	"Modulo.  Semantics unchanged from #845; guard narrowed, and the sign
	convention follows #// above (GemStone's #\\ takes the DIVISOR's sign,
	CPython's Decimal remainder takes the DIVIDEND's)."

	| o |
	o := self ___arithOperand___: other.
	(o @env0:== nil) ifFalse: [
		(Decimal ___isZero___: o) ifTrue: [
			^ ZeroDivisionError ___signal___: 'division by zero'].
		^ self @env0:\\ o].
	^ self ___binOpFallback___: other op: '%' reflected: #'__rmod__:'
%

! ===============================================================================
! Comparison
! ===============================================================================
! Comparisons stay WIDE where arithmetic is narrow, and that asymmetry is
! CPython's own: _convert_for_comparison admits what _convert_other refuses, so
! a Decimal may be ORDERED against an int, a float and a Fraction even though
! ADDING one is a TypeError.  It has to be honoured deliberately here, because
! copying the narrow arithmetic guard onto these dunders would break
! ``Decimal('0.5') < 0.6''.
!
! They are also NOT delegated to env-0 #= / #<, for a reason that is easy to
! miss: fractions.Fraction is a PURE-PYTHON class in Grail
! (src/python/stdlib/fractions.py), so a Fraction operand is a PythonInstance
! and not a kernel Number at all -- ``isKindOf: Number'' answers false for it
! and the env-0 comparison never sees it.  Cross-multiplying an exact
! (numerator, denominator) pair handles the kernel numbers and the Python
! Rationals through one path, and is exact for every one of them.

category: 'Grail-Decimal Internals'
method: Decimal
___cmpRatio___: other
	"(numerator, denominator) for an operand a COMPARISON accepts, with a
	POSITIVE denominator -- or nil, meaning not comparable.

	Wider than ___arithOperand___: by design (see the section comment).  The
	kernel numbers go through #asFraction, which is exact for Integer, Float
	(measured: 0.1 asFraction is 3602879701896397/36028797018963968),
	Fraction and ScaledDecimal alike; ScaledDecimal and Integer are
	fast-pathed ahead of it so the common case builds no Fraction.

	The last branch is the one that matters for conformance: any PYTHON
	object exposing integer numerator/denominator attributes -- which is
	every numbers.Rational, fractions.Fraction included -- is admitted, the
	same widening the pure-Python decimal module made for
	test_compare.test_numbers.  Probed with ___pyAttrLoad___: because these
	are Python PROPERTIES, not env-1 methods, so no method-dictionary test
	can find them; gated on PythonInstance so a String or a Symbol never
	pays for the exception."

	| r n d |
	(other _isScaledDecimal) ifTrue: [
		^ Array @env0:with: (other @env0:mantissa)
			with: (10 @env0:raisedTo: (other @env0:scale))].
	(other isKindOf: Integer) ifTrue: [^ Array @env0:with: other with: 1].
	(other isKindOf: Number) ifTrue: [
		r := other @env0:asFraction.
		(r isKindOf: Integer) ifTrue: [^ Array @env0:with: r with: 1].
		^ Array @env0:with: (r @env0:numerator) with: (r @env0:denominator)].
	((other @env0:class @env0:methodDictForEnv: 1)
		@env0:includesKey: #'__index__') ifTrue: [
			^ Array @env0:with: (other __index__) with: 1].
	(other isKindOf: PythonInstance) ifFalse: [^ nil].
	n := [other @env1:___pyAttrLoad___: #'numerator']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	d := [other @env1:___pyAttrLoad___: #'denominator']
		@env0:on: AbstractException do: [:e | e @env0:return: nil].
	((n isKindOf: Integer) and: [(d isKindOf: Integer) and: [d @env0:~= 0]])
		ifTrue: [
			(d @env0:< 0) ifTrue: [
				^ Array @env0:with: (n @env0:negated) with: (d @env0:negated)].
			^ Array @env0:with: n with: d].
	^ nil
%

category: 'Grail-Decimal Internals'
method: Decimal
___cmpTo___: other
	"-1, 0 or 1 comparing the receiver to `other` EXACTLY -- or nil when the
	operand is not comparable.

	The receiver is mantissa/10^scale and the operand is n/d with d > 0, so
	one cross-multiplication settles it in exact integer arithmetic: no
	division, no float, and no dependence on either operand's scale."

	| r m s left right |
	r := self ___cmpRatio___: other.
	(r @env0:== nil) ifTrue: [^ nil].
	m := self @env0:mantissa.
	s := 10 @env0:raisedTo: (self @env0:scale).
	left := m @env0:* (r @env0:at: 2).
	right := (r @env0:at: 1) @env0:* s.
	(left @env0:< right) ifTrue: [^ -1].
	(left @env0:> right) ifTrue: [^ 1].
	^ 0
%

category: 'Grail-Comparison'
method: Decimal
__eq__: other
	"Test equality.  Answers false for a non-number rather than raising, as
	CPython does -- Decimal(1) == 'a' is False, not a TypeError."

	| c |
	c := self ___cmpTo___: other.
	(c @env0:== nil) ifTrue: [^ false].
	^ c @env0:= 0
%

category: 'Grail-Comparison'
method: Decimal
__ne__: other
	"Test inequality.  True for a non-number, mirroring __eq__:."

	| c |
	c := self ___cmpTo___: other.
	(c @env0:== nil) ifTrue: [^ true].
	^ c @env0:~= 0
%

category: 'Grail-Comparison'
method: Decimal
__lt__: other
	"Test less than.

	Guarded for the reason #845 measured on the arithmetic dunders and did
	not extend to these: an unguarded env-0 #< hands the operand to
	GemStone's Number generality coercion, which sends env-0 #_generality
	to it, and an env-0 miss is a raw Smalltalk MessageNotUnderstood that no
	Python ``except'' can see."

	| c |
	c := self ___cmpTo___: other.
	(c @env0:== nil) ifTrue: [
		^ self ___cmpFallback___: other op: '<' reflected: #'__gt__:'].
	^ c @env0:< 0
%

category: 'Grail-Comparison'
method: Decimal
__le__: other
	"Test less than or equal.  Guarded like __lt__:."

	| c |
	c := self ___cmpTo___: other.
	(c @env0:== nil) ifTrue: [
		^ self ___cmpFallback___: other op: '<=' reflected: #'__ge__:'].
	^ c @env0:<= 0
%

category: 'Grail-Comparison'
method: Decimal
__gt__: other
	"Test greater than.  Guarded like __lt__:."

	| c |
	c := self ___cmpTo___: other.
	(c @env0:== nil) ifTrue: [
		^ self ___cmpFallback___: other op: '>' reflected: #'__lt__:'].
	^ c @env0:> 0
%

category: 'Grail-Comparison'
method: Decimal
__ge__: other
	"Test greater than or equal.  Guarded like __lt__:."

	| c |
	c := self ___cmpTo___: other.
	(c @env0:== nil) ifTrue: [
		^ self ___cmpFallback___: other op: '>=' reflected: #'__le__:'].
	^ c @env0:>= 0
%

category: 'Grail-Hash'
method: Decimal
__hash__
	"Return hash value"
	^ self @env0:hash
%

set compile_env: 0
