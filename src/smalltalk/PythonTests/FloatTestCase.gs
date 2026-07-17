! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FloatTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FloatTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FloatTestCase category: 'Grail-SUnit'
%

set compile_env: 0

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__abs__
	"Test float.__abs__()"

	self assert: (5.5 @env1:__abs__) equals: 5.5.
	self assert: (-5.5 @env1:__abs__) equals: 5.5.
	self assert: (0.0 @env1:__abs__) equals: 0.0.
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__add__
	"Test float.__add__()"

	self assert: (3.5 @env1:__add__: 2.5) equals: 6.0.
	self assert: ((-3.5) @env1:__add__: 2.5) equals: -1.0.
	self assert: (3.5 @env1:__add__: -2.5) equals: 1.0.
	self assert: (0.0 @env1:__add__: 0.0) equals: 0.0.
%

category: 'Grail-Tests - Conversion'
method: FloatTestCase
test__bool__
	"Test float.__bool__()"

	self assert: (3.14 @env1:__bool__).
	self assert: (-5.5 @env1:__bool__).
	self assert: (0.1 @env1:__bool__).
	self deny: (0.0 @env1:__bool__).
%

category: 'Grail-Tests - Rounding'
method: FloatTestCase
test__ceil__
	"Test float.__ceil__()"

	self assert: (3.1 @env1:__ceil__) equals: 4.
	self assert: (3.9 @env1:__ceil__) equals: 4.
	self assert: (-3.9 @env1:__ceil__) equals: -3.
%

category: 'Grail-Tests - Introspection'
method: FloatTestCase
test__dir__
	"Test float.__dir__ - inherited from Object"

	| result |
	result := 3.14 @env1:__dir__.
	self assert: (result isKindOf: Array).
	self assert: (result size > 0).
	"Should include some Python methods"
	self assert: (result includes: '__add__').
	self assert: (result includes: '__str__').
	self assert: (result includes: 'is_integer').
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__divmod__
	"Test float.__divmod__()"

	| result |
	result := 7.5 @env1:__divmod__: 2.0.
	self assert: (result isKindOf: Array).
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 3.0.
	self assert: ((result at: 2) - 1.5) abs < 0.0001.
%

category: 'Grail-Tests - Documentation'
method: FloatTestCase
test__doc__
	"Test float.__doc__"

	| doc |
	doc := Float @env1:__doc__.
	self assert: (doc isKindOf: Unicode7).
	self assert: (doc size > 0).
%

category: 'Grail-Tests - Comparison'
method: FloatTestCase
test__eq__
	"Test float.__eq__()"

	self assert: (5.0 @env1:__eq__: 5.0).
	self deny: (5.0 @env1:__eq__: 3.0).
%

category: 'Grail-Tests - Conversion'
method: FloatTestCase
test__float__
	"Test float.__float__()"

	self assert: (3.14 @env1:__float__) equals: 3.14.
	self assert: (-5.5 @env1:__float__) equals: -5.5.
	self assert: (0.0 @env1:__float__) equals: 0.0.
%

category: 'Grail-Tests - Rounding'
method: FloatTestCase
test__floor__
	"Test float.__floor__()"

	self assert: (3.9 @env1:__floor__) equals: 3.
	self assert: (3.1 @env1:__floor__) equals: 3.
	self assert: (-3.1 @env1:__floor__) equals: -4.
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__floordiv__
	"Test float.__floordiv__()"

	self assert: (7.0 @env1:__floordiv__: 2.0) equals: 3.0.
	self assert: (7.5 @env1:__floordiv__: 2.0) equals: 3.0.
	self assert: ((-7.5) @env1:__floordiv__: 2.0) equals: -4.0.
%

category: 'Grail-Tests - Comparison'
method: FloatTestCase
test__ge__
	"Test float.__ge__()"

	self assert: (5.0 @env1:__ge__: 3.0).
	self assert: (5.0 @env1:__ge__: 5.0).
	self deny: (3.0 @env1:__ge__: 5.0).
%

category: 'Grail-Tests - Comparison'
method: FloatTestCase
test__gt__
	"Test float.__gt__()"

	self assert: (5.0 @env1:__gt__: 3.0).
	self deny: (3.0 @env1:__gt__: 5.0).
	self deny: (5.0 @env1:__gt__: 5.0).
%

category: 'Grail-Tests - Conversion'
method: FloatTestCase
test__int__
	"Test float.__int__()"

	self assert: (3.14 @env1:__int__) equals: 3.
	self assert: (-5.9 @env1:__int__) equals: -5.
	self assert: (0.0 @env1:__int__) equals: 0.
%

category: 'Grail-Tests - Comparison'
method: FloatTestCase
test__le__
	"Test float.__le__()"

	self assert: (3.0 @env1:__le__: 5.0).
	self assert: (5.0 @env1:__le__: 5.0).
	self deny: (5.0 @env1:__le__: 3.0).
%

category: 'Grail-Tests - Comparison'
method: FloatTestCase
test__lt__
	"Test float.__lt__()"

	self assert: (3.0 @env1:__lt__: 5.0).
	self deny: (5.0 @env1:__lt__: 3.0).
	self deny: (5.0 @env1:__lt__: 5.0).
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__mod__
	"Test float.__mod__()"

	| result |
	result := 7.5 @env1:__mod__: 2.0.
	self assert: (result - 1.5) abs < 0.0001.

	result := (-7.5) @env1:__mod__: 2.0.
	self assert: (result - 0.5) abs < 0.0001.
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__mul__
	"Test float.__mul__()"

	self assert: (3.0 @env1:__mul__: 4.0) equals: 12.0.
	self assert: ((-3.0) @env1:__mul__: 4.0) equals: -12.0.
	self assert: (3.0 @env1:__mul__: 0.0) equals: 0.0.
%

category: 'Grail-Tests - Comparison'
method: FloatTestCase
test__ne__
	"Test float.__ne__()"

	self assert: (5.0 @env1:__ne__: 3.0).
	self deny: (5.0 @env1:__ne__: 5.0).
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__neg__
	"Test float.__neg__()"

	self assert: (5.5 @env1:__neg__) equals: -5.5.
	self assert: (-5.5 @env1:__neg__) equals: 5.5.
	self assert: (0.0 @env1:__neg__) equals: 0.0.
%

category: 'Grail-Tests - Initialization'
method: FloatTestCase
test__new__
	"Test float() constructor"

	| result |
	"float() with no args returns 0.0"
	result := Float @env1:__new__.
	self assert: result equals: 0.0.

	"float(3.14) returns 3.14"
	result := Float ___new___: 3.14.
	self assert: result equals: 3.14.

	"float(-5.5) returns -5.5"
	result := Float ___new___: -5.5.
	self assert: result equals: -5.5.
%

category: 'Grail-Tests - Initialization'
method: FloatTestCase
test__new__fromInteger
	"Test float() from integer"

	| result |
	"float(42) returns 42.0"
	result := Float ___new___: 42.
	self assert: result equals: 42.0.

	"float(-5) returns -5.0"
	result := Float ___new___: -5.
	self assert: result equals: -5.0.

	"float(0) returns 0.0"
	result := Float ___new___: 0.
	self assert: result equals: 0.0.
%

category: 'Grail-Tests - Initialization'
method: FloatTestCase
test__new__fromString
	"Test float() from string"

	| result |
	"float('3.14') returns 3.14"
	result := Float ___new___: '3.14'.
	self assert: (result - 3.14) abs < 0.0001.

	"float('-5.5') returns -5.5"
	result := Float ___new___: '-5.5'.
	self assert: result equals: -5.5.

	"float('  100.0  ') returns 100.0 (strips whitespace)"
	result := Float ___new___: '  100.0  '.
	self assert: result equals: 100.0.
%

category: 'Grail-Tests - Initialization'
method: FloatTestCase
test__new__fromStringSpecial
	"Test float() from special string values"

	| result kind |
	"float('inf') returns infinity"
	result := Float ___new___: 'inf'.
	kind := result _getKind.
	self assert: kind equals: 3.  "3 = infinity"

	"float('-inf') returns negative infinity"
	result := Float ___new___: '-inf'.
	kind := result _getKind.
	self assert: kind equals: 3.  "3 = infinity"
	self assert: (result < 0).

	"float('nan') returns NaN"
	result := Float ___new___: 'nan'.
	kind := result _getKind.
	self assert: kind > 4.  "5 or 6 = NaN"
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__pos__
	"Test float.__pos__()"

	self assert: (5.5 @env1:__pos__) equals: 5.5.
	self assert: (-5.5 @env1:__pos__) equals: -5.5.
	self assert: (0.0 @env1:__pos__) equals: 0.0.
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__pow__
	"Test float.__pow__()"

	self assert: (2.0 @env1:__pow__: 3.0) equals: 8.0.
	self assert: (3.0 @env1:__pow__: 2.0) equals: 9.0.
	self assert: (5.0 @env1:__pow__: 0.0) equals: 1.0.
	self assert: (2.0 @env1:__pow__: 0.5) - 1.41421 abs < 0.001.
%

category: 'Grail-Tests - String Representation'
method: FloatTestCase
test__repr__
	"Test float.__repr__()"

	| result |
	result := 3.14 @env1:__repr__.
	self assert: (result isKindOf: Unicode7).
	self assert: (result includesString: '3.14').

	result := -5.5 @env1:__repr__.
	self assert: (result includesString: '-5.5').

	result := 0.0 @env1:__repr__.
	self assert: (result includesString: '0').
%

category: 'Grail-Tests - Rounding'
method: FloatTestCase
test__round__
	"Test float.__round__()"

	self assert: (3.5 @env1:__round__) equals: 4.
	self assert: (3.4 @env1:__round__) equals: 3.
	self assert: (-3.5 @env1:__round__) equals: -4.
%

category: 'Grail-Tests - Rounding'
method: FloatTestCase
test__round__ndigits
	"Test float.__round__(ndigits)"

	| result |
	result := 3.14159 @env1:__round__: 2.
	self assert: (result - 3.14) abs < 0.01.

	result := 3.14159 @env1:__round__: 0.
	self assert: result equals: 3.
%

category: 'Grail-Tests - String Representation'
method: FloatTestCase
test__str__
	"Test float.__str__()"

	| result |
	result := 3.14 @env1:__str__.
	self assert: (result isKindOf: Unicode7).
	self assert: (result includesString: '3.14').

	result := -5.5 @env1:__str__.
	self assert: (result includesString: '-5.5').

	"Test -0.0 special case"
	result := -0.0 @env1:__str__.
	self assert: result equals: '-0.0'.
%

category: 'Grail-Tests - String Representation'
method: FloatTestCase
test__repr__nonFinite
	"Non-finite floats repr/str with CPython's spellings (inf / -inf / nan),
	not GemStone's PlusInfinity / MinusInfinity / *QuietNaN."

	| posInf negInf nan |
	posInf := 1.0e308 * 10.0.
	negInf := posInf negated.
	nan := posInf - posInf.
	self assert: (posInf @env1:__repr__) equals: 'inf'.
	self assert: (negInf @env1:__repr__) equals: '-inf'.
	self assert: (nan @env1:__repr__) equals: 'nan'.
	self assert: (posInf @env1:__str__) equals: 'inf'.
	self assert: (negInf @env1:__str__) equals: '-inf'.
	self assert: (nan @env1:__str__) equals: 'nan'.
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__sub__
	"Test float.__sub__()"

	self assert: (7.5 @env1:__sub__: 2.5) equals: 5.0.
	self assert: (3.5 @env1:__sub__: 7.5) equals: -4.0.
	self assert: ((-3.5) @env1:__sub__: 2.5) equals: -6.0.
%

category: 'Grail-Tests - Arithmetic'
method: FloatTestCase
test__truediv__
	"Test float.__truediv__()"

	self assert: (7.0 @env1:__truediv__: 2.0) equals: 3.5.
	self assert: ((-7.0) @env1:__truediv__: 2.0) equals: -3.5.
	self assert: (1.0 @env1:__truediv__: 4.0) equals: 0.25.
%

category: 'Grail-Tests - Rounding'
method: FloatTestCase
test__trunc__
	"Test float.__trunc__()"

	self assert: (3.9 @env1:__trunc__) equals: 3.
	self assert: (-3.9 @env1:__trunc__) equals: -3.
	self assert: (0.0 @env1:__trunc__) equals: 0.
%

category: 'Grail-Tests - Float Methods'
method: FloatTestCase
test_as_integer_ratio
	"Test float.as_integer_ratio()"

	| result |
	result := 1.5 @env1:as_integer_ratio.
	self assert: (result isKindOf: Array).
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 3.
	self assert: (result at: 2) equals: 2.
%

category: 'Grail-Tests - Float Methods'
method: FloatTestCase
test_conjugate
	"Test float.conjugate()"

	self assert: (3.14 @env1:conjugate) equals: 3.14.
	self assert: (-5.5 @env1:conjugate) equals: -5.5.
%

category: 'Grail-Tests - Properties'
method: FloatTestCase
test_imag
	"Test float.imag property"

	self assert: (3.14 @env1:imag) equals: 0.0.
	self assert: (-5.5 @env1:imag) equals: 0.0.
%

category: 'Grail-Tests - Float Methods'
method: FloatTestCase
test_is_integer
	"Test float.is_integer()"

	self assert: (3.0 @env1:is_integer).
	self assert: (42.0 @env1:is_integer).
	self deny: (3.14 @env1:is_integer).
	self deny: (3.1 @env1:is_integer).
%

category: 'Grail-Tests - Properties'
method: FloatTestCase
test_real
	"Test float.real property"

	self assert: (3.14 @env1:real) equals: 3.14.
	self assert: (-5.5 @env1:real) equals: -5.5.
%

category: 'Grail-Tests - Eval - Arithmetic'
method: FloatTestCase
testEvalFloatArithmetic
	"Test float arithmetic via Python source"

	self assert: (self eval: '3.0 + 2.0') equals: 5.0.
	self assert: (self eval: '10.0 - 3.5') equals: 6.5.
	self assert: (self eval: '2.5 * 4.0') equals: 10.0.
	self assert: (self eval: '10.0 / 4.0') equals: 2.5.
%

category: 'Grail-Tests - Eval - Comparison'
method: FloatTestCase
testEvalFloatComparison
	"Test float comparisons via Python source"

	self assert: (self eval: '3.14 > 2.5').
	self assert: (self eval: '2.5 < 3.14').
	self assert: (self eval: '3.14 == 3.14').
	self assert: (self eval: '3.14 != 2.5').
%

category: 'Grail-Tests - Eval - Functions'
method: FloatTestCase
testEvalFloatFunctions
	"Test builtin functions on floats via Python source"

	self assert: (self eval: 'abs(-3.14)') equals: 3.14.
	self assert: (self eval: 'round(3.7)') equals: 4.
	self assert: (self eval: 'round(3.2)') equals: 3.
%

category: 'Grail-Tests - Eval - Literals'
method: FloatTestCase
testEvalFloatLiteral
	"Test float literal creation via Python source"

	self assert: (self eval: '3.14') equals: 3.14.
	self assert: (self eval: '-2.5') equals: -2.5.
	self assert: (self eval: '0.0') equals: 0.0.
%

category: 'Grail-Tests - Eval - Negation'
method: FloatTestCase
testEvalFloatNegation
	"Test float negation via Python source"

	self assert: (self eval: '-3.14') equals: -3.14.
	self assert: (self eval: '--3.14') equals: 3.14.
%

category: 'Grail-Tests - Eval - Mixed Arithmetic'
method: FloatTestCase
testEvalMixedArithmetic
	"Test mixed int/float arithmetic via Python source"

	self assert: (self eval: '3 + 2.5') equals: 5.5.
	self assert: (self eval: '10 / 4') equals: 2.5.
	self assert: (self eval: '2.5 * 2') equals: 5.0.
%

category: 'Grail-Tests - Comparison'
method: FloatTestCase
testEqualsRational
	"float == Fraction reflects to Fraction.__eq__ (CPython's == falls back to
	the RHS when the LHS type can't compare), so a float equals a numerically
	equal Fraction on EITHER side.  Was False: kernel = cannot compare a Float
	to a PythonInstance Fraction."

	self assert: (self eval: 'from fractions import Fraction as F
0.40625 == F(13, 32)').
	self assert: (self eval: 'from fractions import Fraction as F
F(13, 32) == 0.40625').
	self assert: (self eval: 'from fractions import Fraction as F
0.5 != F(13, 32)').
	self deny: (self eval: 'from fractions import Fraction as F
0.5 == F(13, 32)')
%

category: 'Grail-Tests - Float Methods'
method: FloatTestCase
testFromHex
	"float.fromhex parses [sign] 0x hexdigits [.hexdigits] [p decexp] EXACTLY
	(the value is the rational M * 2**(p - 4f) rounded once), plus the
	inf/infinity/nan keywords.  Was a NotImplementedError for any p-exponent."

	| fl |
	fl := Python @env0:at: #float.
	self assert: (fl @env1:fromhex: '0x1.8p3') equals: 12.0.
	self assert: (fl @env1:fromhex: '0x10') equals: 16.0.
	self assert: (fl @env1:fromhex: '0x0.8p1') equals: 1.0.
	self assert: (fl @env1:fromhex: '-0x1.0p-1') equals: -0.5.
	"exact round-tripping of a full-precision significand with an exponent"
	self assert: (fl @env1:fromhex: '0x1.5555555555555p+970')
		equals: (2.0 @env0:raisedTo: 970) @env0:* ((16r15555555555555 @env0:asFloat) @env0:/ (2.0 @env0:raisedTo: 52)).
	"signed zero (probed via 1/x -> -inf), keywords, range/format errors"
	self assert: (1.0 @env0:/ (fl @env1:fromhex: '-0x0p0')) equals: MinusInfinity.
	self assert: (1.0 @env0:/ (fl @env1:fromhex: '0x0p0')) equals: PlusInfinity.
	self assert: (fl @env1:fromhex: 'inf') equals: (fl @env1:fromhex: 'Infinity').
	self should: [fl @env1:fromhex: '0x1p+2000'] raise: OverflowError.
	self should: [fl @env1:fromhex: '0xGp0'] raise: ValueError
%
