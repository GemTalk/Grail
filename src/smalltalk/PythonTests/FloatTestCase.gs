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
FloatTestCase category: 'SUnit'
%

set compile_env: 0

category: 'Tests - Arithmetic'
method: FloatTestCase
test__abs__
	"Test float.__abs__()"

	self assert: (5.5 perform: #__abs__ env: 1) equals: 5.5.
	self assert: (-5.5 perform: #__abs__ env: 1) equals: 5.5.
	self assert: (0.0 perform: #__abs__ env: 1) equals: 0.0.
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__add__
	"Test float.__add__()"

	self assert: (3.5 perform: #__add__: env: 1 withArguments: {2.5}) equals: 6.0.
	self assert: ((-3.5) perform: #__add__: env: 1 withArguments: {2.5}) equals: -1.0.
	self assert: (3.5 perform: #__add__: env: 1 withArguments: {-2.5}) equals: 1.0.
	self assert: (0.0 perform: #__add__: env: 1 withArguments: {0.0}) equals: 0.0.
%

category: 'Tests - Conversion'
method: FloatTestCase
test__bool__
	"Test float.__bool__()"

	self assert: (3.14 perform: #__bool__ env: 1).
	self assert: (-5.5 perform: #__bool__ env: 1).
	self assert: (0.1 perform: #__bool__ env: 1).
	self deny: (0.0 perform: #__bool__ env: 1).
%

category: 'Tests - Rounding'
method: FloatTestCase
test__ceil__
	"Test float.__ceil__()"

	self assert: (3.1 perform: #__ceil__ env: 1) equals: 4.
	self assert: (3.9 perform: #__ceil__ env: 1) equals: 4.
	self assert: (-3.9 perform: #__ceil__ env: 1) equals: -3.
%

category: 'Tests - Introspection'
method: FloatTestCase
test__dir__
	"Test float.__dir__ - inherited from Object"

	| result |
	result := 3.14 perform: #__dir__ env: 1.
	self assert: (result isKindOf: Array).
	self assert: (result size > 0).
	"Should include some Python methods"
	self assert: (result includes: '__add__').
	self assert: (result includes: '__str__').
	self assert: (result includes: 'is_integer').
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__divmod__
	"Test float.__divmod__()"

	| result |
	result := 7.5 perform: #__divmod__: env: 1 withArguments: {2.0}.
	self assert: (result isKindOf: Array).
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 3.0.
	self assert: ((result at: 2) - 1.5) abs < 0.0001.
%

category: 'Tests - Documentation'
method: FloatTestCase
test__doc__
	"Test float.__doc__"

	| doc |
	doc := Float perform: #__doc__ env: 1.
	self assert: (doc isKindOf: Unicode7).
	self assert: (doc size > 0).
%

category: 'Tests - Comparison'
method: FloatTestCase
test__eq__
	"Test float.__eq__()"

	self assert: (5.0 perform: #__eq__: env: 1 withArguments: {5.0}).
	self deny: (5.0 perform: #__eq__: env: 1 withArguments: {3.0}).
%

category: 'Tests - Conversion'
method: FloatTestCase
test__float__
	"Test float.__float__()"

	self assert: (3.14 perform: #__float__ env: 1) equals: 3.14.
	self assert: (-5.5 perform: #__float__ env: 1) equals: -5.5.
	self assert: (0.0 perform: #__float__ env: 1) equals: 0.0.
%

category: 'Tests - Rounding'
method: FloatTestCase
test__floor__
	"Test float.__floor__()"

	self assert: (3.9 perform: #__floor__ env: 1) equals: 3.
	self assert: (3.1 perform: #__floor__ env: 1) equals: 3.
	self assert: (-3.1 perform: #__floor__ env: 1) equals: -4.
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__floordiv__
	"Test float.__floordiv__()"

	self assert: (7.0 perform: #__floordiv__: env: 1 withArguments: {2.0}) equals: 3.0.
	self assert: (7.5 perform: #__floordiv__: env: 1 withArguments: {2.0}) equals: 3.0.
	self assert: ((-7.5) perform: #__floordiv__: env: 1 withArguments: {2.0}) equals: -4.0.
%

category: 'Tests - Comparison'
method: FloatTestCase
test__ge__
	"Test float.__ge__()"

	self assert: (5.0 perform: #__ge__: env: 1 withArguments: {3.0}).
	self assert: (5.0 perform: #__ge__: env: 1 withArguments: {5.0}).
	self deny: (3.0 perform: #__ge__: env: 1 withArguments: {5.0}).
%

category: 'Tests - Comparison'
method: FloatTestCase
test__gt__
	"Test float.__gt__()"

	self assert: (5.0 perform: #__gt__: env: 1 withArguments: {3.0}).
	self deny: (3.0 perform: #__gt__: env: 1 withArguments: {5.0}).
	self deny: (5.0 perform: #__gt__: env: 1 withArguments: {5.0}).
%

category: 'Tests - Conversion'
method: FloatTestCase
test__int__
	"Test float.__int__()"

	self assert: (3.14 perform: #__int__ env: 1) equals: 3.
	self assert: (-5.9 perform: #__int__ env: 1) equals: -5.
	self assert: (0.0 perform: #__int__ env: 1) equals: 0.
%

category: 'Tests - Comparison'
method: FloatTestCase
test__le__
	"Test float.__le__()"

	self assert: (3.0 perform: #__le__: env: 1 withArguments: {5.0}).
	self assert: (5.0 perform: #__le__: env: 1 withArguments: {5.0}).
	self deny: (5.0 perform: #__le__: env: 1 withArguments: {3.0}).
%

category: 'Tests - Comparison'
method: FloatTestCase
test__lt__
	"Test float.__lt__()"

	self assert: (3.0 perform: #__lt__: env: 1 withArguments: {5.0}).
	self deny: (5.0 perform: #__lt__: env: 1 withArguments: {3.0}).
	self deny: (5.0 perform: #__lt__: env: 1 withArguments: {5.0}).
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__mod__
	"Test float.__mod__()"

	| result |
	result := 7.5 perform: #__mod__: env: 1 withArguments: {2.0}.
	self assert: (result - 1.5) abs < 0.0001.

	result := (-7.5) perform: #__mod__: env: 1 withArguments: {2.0}.
	self assert: (result - 0.5) abs < 0.0001.
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__mul__
	"Test float.__mul__()"

	self assert: (3.0 perform: #__mul__: env: 1 withArguments: {4.0}) equals: 12.0.
	self assert: ((-3.0) perform: #__mul__: env: 1 withArguments: {4.0}) equals: -12.0.
	self assert: (3.0 perform: #__mul__: env: 1 withArguments: {0.0}) equals: 0.0.
%

category: 'Tests - Comparison'
method: FloatTestCase
test__ne__
	"Test float.__ne__()"

	self assert: (5.0 perform: #__ne__: env: 1 withArguments: {3.0}).
	self deny: (5.0 perform: #__ne__: env: 1 withArguments: {5.0}).
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__neg__
	"Test float.__neg__()"

	self assert: (5.5 perform: #__neg__ env: 1) equals: -5.5.
	self assert: (-5.5 perform: #__neg__ env: 1) equals: 5.5.
	self assert: (0.0 perform: #__neg__ env: 1) equals: 0.0.
%

category: 'Tests - Initialization'
method: FloatTestCase
test__new__
	"Test float() constructor"

	| result |
	"float() with no args returns 0.0"
	result := Float perform: #__new__ env: 1.
	self assert: result equals: 0.0.

	"float(3.14) returns 3.14"
	result := Float ___new___: 3.14.
	self assert: result equals: 3.14.

	"float(-5.5) returns -5.5"
	result := Float ___new___: -5.5.
	self assert: result equals: -5.5.
%

category: 'Tests - Initialization'
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

category: 'Tests - Initialization'
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

category: 'Tests - Initialization'
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

category: 'Tests - Arithmetic'
method: FloatTestCase
test__pos__
	"Test float.__pos__()"

	self assert: (5.5 perform: #__pos__ env: 1) equals: 5.5.
	self assert: (-5.5 perform: #__pos__ env: 1) equals: -5.5.
	self assert: (0.0 perform: #__pos__ env: 1) equals: 0.0.
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__pow__
	"Test float.__pow__()"

	self assert: (2.0 perform: #__pow__: env: 1 withArguments: {3.0}) equals: 8.0.
	self assert: (3.0 perform: #__pow__: env: 1 withArguments: {2.0}) equals: 9.0.
	self assert: (5.0 perform: #__pow__: env: 1 withArguments: {0.0}) equals: 1.0.
	self assert: (2.0 perform: #__pow__: env: 1 withArguments: {0.5}) - 1.41421 abs < 0.001.
%

category: 'Tests - String Representation'
method: FloatTestCase
test__repr__
	"Test float.__repr__()"

	| result |
	result := 3.14 perform: #__repr__ env: 1.
	self assert: (result isKindOf: Unicode7).
	self assert: (result includesString: '3.14').

	result := -5.5 perform: #__repr__ env: 1.
	self assert: (result includesString: '-5.5').

	result := 0.0 perform: #__repr__ env: 1.
	self assert: (result includesString: '0').
%

category: 'Tests - Rounding'
method: FloatTestCase
test__round__
	"Test float.__round__()"

	self assert: (3.5 perform: #__round__ env: 1) equals: 4.
	self assert: (3.4 perform: #__round__ env: 1) equals: 3.
	self assert: (-3.5 perform: #__round__ env: 1) equals: -4.
%

category: 'Tests - Rounding'
method: FloatTestCase
test__round__ndigits
	"Test float.__round__(ndigits)"

	| result |
	result := 3.14159 perform: #__round__: env: 1 withArguments: {2}.
	self assert: (result - 3.14) abs < 0.01.

	result := 3.14159 perform: #__round__: env: 1 withArguments: {0}.
	self assert: result equals: 3.
%

category: 'Tests - String Representation'
method: FloatTestCase
test__str__
	"Test float.__str__()"

	| result |
	result := 3.14 perform: #__str__ env: 1.
	self assert: (result isKindOf: Unicode7).
	self assert: (result includesString: '3.14').

	result := -5.5 perform: #__str__ env: 1.
	self assert: (result includesString: '-5.5').

	"Test -0.0 special case"
	result := -0.0 perform: #__str__ env: 1.
	self assert: result equals: '-0.0'.
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__sub__
	"Test float.__sub__()"

	self assert: (7.5 perform: #__sub__: env: 1 withArguments: {2.5}) equals: 5.0.
	self assert: (3.5 perform: #__sub__: env: 1 withArguments: {7.5}) equals: -4.0.
	self assert: ((-3.5) perform: #__sub__: env: 1 withArguments: {2.5}) equals: -6.0.
%

category: 'Tests - Arithmetic'
method: FloatTestCase
test__truediv__
	"Test float.__truediv__()"

	self assert: (7.0 perform: #__truediv__: env: 1 withArguments: {2.0}) equals: 3.5.
	self assert: ((-7.0) perform: #__truediv__: env: 1 withArguments: {2.0}) equals: -3.5.
	self assert: (1.0 perform: #__truediv__: env: 1 withArguments: {4.0}) equals: 0.25.
%

category: 'Tests - Rounding'
method: FloatTestCase
test__trunc__
	"Test float.__trunc__()"

	self assert: (3.9 perform: #__trunc__ env: 1) equals: 3.
	self assert: (-3.9 perform: #__trunc__ env: 1) equals: -3.
	self assert: (0.0 perform: #__trunc__ env: 1) equals: 0.
%

category: 'Tests - Float Methods'
method: FloatTestCase
test_as_integer_ratio
	"Test float.as_integer_ratio()"

	| result |
	result := 1.5 perform: #as_integer_ratio env: 1.
	self assert: (result isKindOf: Array).
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 3.
	self assert: (result at: 2) equals: 2.
%

category: 'Tests - Float Methods'
method: FloatTestCase
test_conjugate
	"Test float.conjugate()"

	self assert: (3.14 perform: #conjugate env: 1) equals: 3.14.
	self assert: (-5.5 perform: #conjugate env: 1) equals: -5.5.
%

category: 'Tests - Properties'
method: FloatTestCase
test_imag
	"Test float.imag property"

	self assert: (3.14 perform: #imag env: 1) equals: 0.0.
	self assert: (-5.5 perform: #imag env: 1) equals: 0.0.
%

category: 'Tests - Float Methods'
method: FloatTestCase
test_is_integer
	"Test float.is_integer()"

	self assert: (3.0 perform: #is_integer env: 1).
	self assert: (42.0 perform: #is_integer env: 1).
	self deny: (3.14 perform: #is_integer env: 1).
	self deny: (3.1 perform: #is_integer env: 1).
%

category: 'Tests - Properties'
method: FloatTestCase
test_real
	"Test float.real property"

	self assert: (3.14 perform: #real env: 1) equals: 3.14.
	self assert: (-5.5 perform: #real env: 1) equals: -5.5.
%

category: 'Tests - Eval - Arithmetic'
method: FloatTestCase
testEvalFloatArithmetic
	"Test float arithmetic via Python source"

	self assert: (self eval: '3.0 + 2.0') equals: 5.0.
	self assert: (self eval: '10.0 - 3.5') equals: 6.5.
	self assert: (self eval: '2.5 * 4.0') equals: 10.0.
	self assert: (self eval: '10.0 / 4.0') equals: 2.5.
%

category: 'Tests - Eval - Comparison'
method: FloatTestCase
testEvalFloatComparison
	"Test float comparisons via Python source"

	self assert: (self eval: '3.14 > 2.5').
	self assert: (self eval: '2.5 < 3.14').
	self assert: (self eval: '3.14 == 3.14').
	self assert: (self eval: '3.14 != 2.5').
%

category: 'Tests - Eval - Functions'
method: FloatTestCase
testEvalFloatFunctions
	"Test builtin functions on floats via Python source"

	self assert: (self eval: 'abs(-3.14)') equals: 3.14.
	self assert: (self eval: 'round(3.7)') equals: 4.
	self assert: (self eval: 'round(3.2)') equals: 3.
%

category: 'Tests - Eval - Literals'
method: FloatTestCase
testEvalFloatLiteral
	"Test float literal creation via Python source"

	self assert: (self eval: '3.14') equals: 3.14.
	self assert: (self eval: '-2.5') equals: -2.5.
	self assert: (self eval: '0.0') equals: 0.0.
%

category: 'Tests - Eval - Negation'
method: FloatTestCase
testEvalFloatNegation
	"Test float negation via Python source"

	self assert: (self eval: '-3.14') equals: -3.14.
	self assert: (self eval: '--3.14') equals: 3.14.
%

category: 'Tests - Eval - Mixed Arithmetic'
method: FloatTestCase
testEvalMixedArithmetic
	"Test mixed int/float arithmetic via Python source"

	self assert: (self eval: '3 + 2.5') equals: 5.5.
	self assert: (self eval: '10 / 4') equals: 2.5.
	self assert: (self eval: '2.5 * 2') equals: 5.0.
%
