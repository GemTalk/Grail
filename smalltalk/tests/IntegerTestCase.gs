! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IntegerTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IntegerTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IntegerTestCase category: 'SUnit'
%

! ===============================================================================
! IntegerTestCase - Tests for Python int type (mapped to GemStone Integer)
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
IntegerTestCase removeAllMethods.
IntegerTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__abs__
	"Test int.__abs__()"

	self assert: (5 perform: #__abs__ env: 1) equals: 5.
	self assert: (-5 perform: #__abs__ env: 1) equals: 5.
	self assert: (0 perform: #__abs__ env: 1) equals: 0.
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__add__
	"Test int.__add__()"

	self assert: (3 perform: #__add__: env: 1 withArguments: {4}) equals: 7.
	self assert: (-3 perform: #__add__: env: 1 withArguments: {4}) equals: 1.
	self assert: (3 perform: #__add__: env: 1 withArguments: {-4}) equals: -1.
	self assert: (0 perform: #__add__: env: 1 withArguments: {0}) equals: 0.
%

category: 'Tests - Bitwise'
method: IntegerTestCase
test__and__
	"Test int.__and__()"

	self assert: (12 perform: #__and__: env: 1 withArguments: {10}) equals: 8.  "1100 & 1010 = 1000"
	self assert: (5 perform: #__and__: env: 1 withArguments: {3}) equals: 1.    "101 & 11 = 1"
%

category: 'Tests - Conversion'
method: IntegerTestCase
test__bool__
	"Test int.__bool__()"

	self assert: (42 perform: #__bool__ env: 1).
	self assert: (-5 perform: #__bool__ env: 1).
	self assert: (1 perform: #__bool__ env: 1).
	self deny: (0 perform: #__bool__ env: 1).
%

category: 'Tests - Rounding'
method: IntegerTestCase
test__ceil__
	"Test int.__ceil__()"

	self assert: (42 perform: #__ceil__ env: 1) equals: 42.
	self assert: (-5 perform: #__ceil__ env: 1) equals: -5.
%

category: 'Tests - Introspection'
method: IntegerTestCase
test__dir__
	"Test int.__dir__ - inherited from Object"

	| result |
	result := 42 perform: #__dir__ env: 1.
	self assert: (result isKindOf: Array).
	self assert: (result size > 0).
	"Should include some Python methods"
	self assert: (result includes: '__add__').
	self assert: (result includes: '__str__').
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__divmod__
	"Test int.__divmod__()"

	| result |
	result := 7 perform: #__divmod__: env: 1 withArguments: {3}.
	self assert: (result isKindOf: Array).
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 2.
	self assert: (result at: 2) equals: 1.
%

category: 'Tests - Documentation'
method: IntegerTestCase
test__doc__
	"Test int.__doc__"

	| doc |
	doc := Integer perform: #__doc__ env: 1.
	self assert: (doc isKindOf: Unicode7).
	self assert: (doc size > 0).
%

category: 'Tests - Comparison'
method: IntegerTestCase
test__eq__
	"Test int.__eq__()"

	self assert: (5 perform: #__eq__: env: 1 withArguments: {5}).
	self deny: (5 perform: #__eq__: env: 1 withArguments: {3}).
%

category: 'Tests - Conversion'
method: IntegerTestCase
test__float__
	"Test int.__float__()"

	| result |
	result := 42 perform: #__float__ env: 1.
	self assert: (result isKindOf: Float).
	self assert: result equals: 42.0.

	result := -5 perform: #__float__ env: 1.
	self assert: result equals: -5.0.
%

category: 'Tests - Rounding'
method: IntegerTestCase
test__floor__
	"Test int.__floor__()"

	self assert: (42 perform: #__floor__ env: 1) equals: 42.
	self assert: (-5 perform: #__floor__ env: 1) equals: -5.
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__floordiv__
	"Test int.__floordiv__()"

	self assert: (7 perform: #__floordiv__: env: 1 withArguments: {3}) equals: 2.
	self assert: (-7 perform: #__floordiv__: env: 1 withArguments: {3}) equals: -3.
	self assert: (7 perform: #__floordiv__: env: 1 withArguments: {-3}) equals: -3.
%

category: 'Tests - Comparison'
method: IntegerTestCase
test__ge__
	"Test int.__ge__()"

	self assert: (5 perform: #__ge__: env: 1 withArguments: {3}).
	self assert: (5 perform: #__ge__: env: 1 withArguments: {5}).
	self deny: (3 perform: #__ge__: env: 1 withArguments: {5}).
%

category: 'Tests - Comparison'
method: IntegerTestCase
test__gt__
	"Test int.__gt__()"

	self assert: (5 perform: #__gt__: env: 1 withArguments: {3}).
	self deny: (3 perform: #__gt__: env: 1 withArguments: {5}).
	self deny: (5 perform: #__gt__: env: 1 withArguments: {5}).
%

category: 'Tests - Conversion'
method: IntegerTestCase
test__int__
	"Test int.__int__()"

	self assert: (42 perform: #__int__ env: 1) equals: 42.
	self assert: (-5 perform: #__int__ env: 1) equals: -5.
	self assert: (0 perform: #__int__ env: 1) equals: 0.
%

category: 'Tests - Bitwise'
method: IntegerTestCase
test__invert__
	"Test int.__invert__()"

	self assert: (5 perform: #__invert__ env: 1) equals: -6.
	self assert: (-1 perform: #__invert__ env: 1) equals: 0.
	self assert: (0 perform: #__invert__ env: 1) equals: -1.
%

category: 'Tests - Comparison'
method: IntegerTestCase
test__le__
	"Test int.__le__()"

	self assert: (3 perform: #__le__: env: 1 withArguments: {5}).
	self assert: (5 perform: #__le__: env: 1 withArguments: {5}).
	self deny: (5 perform: #__le__: env: 1 withArguments: {3}).
%

category: 'Tests - Bitwise'
method: IntegerTestCase
test__lshift__
	"Test int.__lshift__()"

	self assert: (5 perform: #__lshift__: env: 1 withArguments: {2}) equals: 20.  "101 << 2 = 10100"
	self assert: (1 perform: #__lshift__: env: 1 withArguments: {3}) equals: 8.
%

category: 'Tests - Comparison'
method: IntegerTestCase
test__lt__
	"Test int.__lt__()"

	self assert: (3 perform: #__lt__: env: 1 withArguments: {5}).
	self deny: (5 perform: #__lt__: env: 1 withArguments: {3}).
	self deny: (5 perform: #__lt__: env: 1 withArguments: {5}).
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__mod__
	"Test int.__mod__()"

	self assert: (7 perform: #__mod__: env: 1 withArguments: {3}) equals: 1.
	self assert: (-7 perform: #__mod__: env: 1 withArguments: {3}) equals: 2.
	self assert: (7 perform: #__mod__: env: 1 withArguments: {-3}) equals: -2.
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__mul__
	"Test int.__mul__()"

	self assert: (3 perform: #__mul__: env: 1 withArguments: {4}) equals: 12.
	self assert: (-3 perform: #__mul__: env: 1 withArguments: {4}) equals: -12.
	self assert: (3 perform: #__mul__: env: 1 withArguments: {0}) equals: 0.
%

category: 'Tests - Comparison'
method: IntegerTestCase
test__ne__
	"Test int.__ne__()"

	self assert: (5 perform: #__ne__: env: 1 withArguments: {3}).
	self deny: (5 perform: #__ne__: env: 1 withArguments: {5}).
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__neg__
	"Test int.__neg__()"

	self assert: (5 perform: #__neg__ env: 1) equals: -5.
	self assert: (-5 perform: #__neg__ env: 1) equals: 5.
	self assert: (0 perform: #__neg__ env: 1) equals: 0.
%

category: 'Tests - Initialization'
method: IntegerTestCase
test__new__
	"Test int() constructor"

	| result |
	"int() with no args returns 0"
	result := Integer perform: #__new__ env: 1.
	self assert: result equals: 0.

	"int(42) returns 42"
	result := Integer ___new___: 42.
	self assert: result equals: 42.

	"int(-5) returns -5"
	result := Integer ___new___: -5.
	self assert: result equals: -5.
%

category: 'Tests - Initialization'
method: IntegerTestCase
test__new__fromFloat
	"Test int() from float"

	| result |
	"int(3.14) returns 3"
	result := Integer ___new___: 3.14.
	self assert: result equals: 3.

	"int(-3.14) returns -3"
	result := Integer ___new___: -3.14.
	self assert: result equals: -3.

	"int(3.9) returns 3 (truncates, not rounds)"
	result := Integer ___new___: 3.9.
	self assert: result equals: 3.
%

category: 'Tests - Initialization'
method: IntegerTestCase
test__new__fromString
	"Test int() from string"

	| result |
	"int('42') returns 42"
	result := Integer ___new___: '42'.
	self assert: result equals: 42.

	"int('-5') returns -5"
	result := Integer ___new___: '-5'.
	self assert: result equals: -5.

	"int('  100  ') returns 100 (strips whitespace)"
	result := Integer ___new___: '  100  '.
	self assert: result equals: 100.
%

category: 'Tests - Bitwise'
method: IntegerTestCase
test__or__
	"Test int.__or__()"

	self assert: (12 perform: #__or__: env: 1 withArguments: {10}) equals: 14.  "1100 | 1010 = 1110"
	self assert: (5 perform: #__or__: env: 1 withArguments: {3}) equals: 7.     "101 | 11 = 111"
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__pos__
	"Test int.__pos__()"

	self assert: (5 perform: #__pos__ env: 1) equals: 5.
	self assert: (-5 perform: #__pos__ env: 1) equals: -5.
	self assert: (0 perform: #__pos__ env: 1) equals: 0.
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__pow__
	"Test int.__pow__()"

	self assert: (2 perform: #__pow__: env: 1 withArguments: {3}) equals: 8.
	self assert: (3 perform: #__pow__: env: 1 withArguments: {2}) equals: 9.
	self assert: (5 perform: #__pow__: env: 1 withArguments: {0}) equals: 1.
	self assert: (-2 perform: #__pow__: env: 1 withArguments: {3}) equals: -8.
%

category: 'Tests - String Representation'
method: IntegerTestCase
test__repr__
	"Test int.__repr__()"

	| result |
	result := 42 perform: #__repr__ env: 1.
	self assert: (result isKindOf: Unicode7).
	self assert: result equals: '42'.

	result := -5 perform: #__repr__ env: 1.
	self assert: result equals: '-5'.

	result := 0 perform: #__repr__ env: 1.
	self assert: result equals: '0'.
%

category: 'Tests - Rounding'
method: IntegerTestCase
test__round__
	"Test int.__round__()"

	self assert: (42 perform: #__round__ env: 1) equals: 42.
	self assert: (-5 perform: #__round__ env: 1) equals: -5.
%

category: 'Tests - Bitwise'
method: IntegerTestCase
test__rshift__
	"Test int.__rshift__()"

	self assert: (20 perform: #__rshift__: env: 1 withArguments: {2}) equals: 5.  "10100 >> 2 = 101"
	self assert: (8 perform: #__rshift__: env: 1 withArguments: {3}) equals: 1.
%

category: 'Tests - String Representation'
method: IntegerTestCase
test__str__
	"Test int.__str__()"

	| result |
	result := 42 perform: #__str__ env: 1.
	self assert: (result isKindOf: Unicode7).
	self assert: result equals: '42'.

	result := -5 perform: #__str__ env: 1.
	self assert: result equals: '-5'.
%

category: 'Tests - Arithmetic'
method: IntegerTestCase
test__sub__
	"Test int.__sub__()"

	self assert: (7 perform: #__sub__: env: 1 withArguments: {4}) equals: 3.
	self assert: (3 perform: #__sub__: env: 1 withArguments: {7}) equals: -4.
	self assert: (-3 perform: #__sub__: env: 1 withArguments: {4}) equals: -7.
%

category: 'Tests - Rounding'
method: IntegerTestCase
test__trunc__
	"Test int.__trunc__()"

	self assert: (42 perform: #__trunc__ env: 1) equals: 42.
	self assert: (-5 perform: #__trunc__ env: 1) equals: -5.
%

category: 'Tests - Bitwise'
method: IntegerTestCase
test__xor__
	"Test int.__xor__()"

	self assert: (12 perform: #__xor__: env: 1 withArguments: {10}) equals: 6.  "1100 ^ 1010 = 0110"
	self assert: (5 perform: #__xor__: env: 1 withArguments: {3}) equals: 6.    "101 ^ 11 = 110"
%

category: 'Tests - Large Integers'
method: IntegerTestCase
test_arbitraryPrecision
	"Test that int supports arbitrary precision like Python"

	| big result |
	"Test a number larger than 64-bit"
	big := 10 raisedTo: 100.
	self assert: (big isKindOf: Integer).

	"Can do arithmetic on large numbers"
	result := big + 1.
	self assert: (result isKindOf: Integer).
	self assert: result > big.
%

category: 'Tests - Integer Methods'
method: IntegerTestCase
test_as_integer_ratio
	"Test int.as_integer_ratio()"

	| result |
	result := 42 perform: #as_integer_ratio env: 1.
	self assert: (result isKindOf: Array).
	self assert: result size equals: 2.
	self assert: (result at: 1) equals: 42.
	self assert: (result at: 2) equals: 1.
%

category: 'Tests - Integer Methods'
method: IntegerTestCase
test_bit_count
	"Test int.bit_count()"

	self assert: (0 perform: #bit_count env: 1) equals: 0.
	self assert: (1 perform: #bit_count env: 1) equals: 1.
	self assert: (3 perform: #bit_count env: 1) equals: 2.   "11"
	self assert: (7 perform: #bit_count env: 1) equals: 3.   "111"
	self assert: (15 perform: #bit_count env: 1) equals: 4.  "1111"
	self assert: (255 perform: #bit_count env: 1) equals: 8.
%

category: 'Tests - Integer Methods'
method: IntegerTestCase
test_bit_length
	"Test int.bit_length()"

	self assert: (0 perform: #bit_length env: 1) equals: 0.
	self assert: (1 perform: #bit_length env: 1) equals: 1.
	self assert: (2 perform: #bit_length env: 1) equals: 2.
	self assert: (3 perform: #bit_length env: 1) equals: 2.
	self assert: (4 perform: #bit_length env: 1) equals: 3.
	self assert: (7 perform: #bit_length env: 1) equals: 3.
	self assert: (8 perform: #bit_length env: 1) equals: 4.
	self assert: (255 perform: #bit_length env: 1) equals: 8.
%

category: 'Tests - Integer Methods'
method: IntegerTestCase
test_conjugate
	"Test int.conjugate()"

	self assert: (42 perform: #conjugate env: 1) equals: 42.
	self assert: (-5 perform: #conjugate env: 1) equals: -5.
%

category: 'Tests - Properties'
method: IntegerTestCase
test_denominator
	"Test int.denominator property"

	self assert: (42 perform: #denominator env: 1) equals: 1.
	self assert: (-5 perform: #denominator env: 1) equals: 1.
%

category: 'Tests - Properties'
method: IntegerTestCase
test_imag
	"Test int.imag property"

	self assert: (42 perform: #imag env: 1) equals: 0.
	self assert: (-5 perform: #imag env: 1) equals: 0.
%

category: 'Tests - Integer Methods'
method: IntegerTestCase
test_is_integer
	"Test int.is_integer()"

	self assert: (42 perform: #is_integer env: 1).
	self assert: (-5 perform: #is_integer env: 1).
	self assert: (0 perform: #is_integer env: 1).
%

category: 'Tests - Properties'
method: IntegerTestCase
test_numerator
	"Test int.numerator property"

	self assert: (42 perform: #numerator env: 1) equals: 42.
	self assert: (-5 perform: #numerator env: 1) equals: -5.
%

category: 'Tests - Properties'
method: IntegerTestCase
test_real
	"Test int.real property"

	self assert: (42 perform: #real env: 1) equals: 42.
	self assert: (-5 perform: #real env: 1) equals: -5.
%

category: 'Tests - Eval - Arithmetic'
method: IntegerTestCase
testEvalArithmetic
	"Test basic integer arithmetic via Python source"

	self assert: (self eval: '3 + 4') equals: 7.
	self assert: (self eval: '10 - 3') equals: 7.
	self assert: (self eval: '6 * 7') equals: 42.
	self assert: (self eval: '7 // 3') equals: 2.
	self assert: (self eval: '7 % 3') equals: 1.
	self assert: (self eval: '2 ** 10') equals: 1024.
%

category: 'Tests - Eval - Variables'
method: IntegerTestCase
testEvalAssignment
	"Test integer variable assignment and use via Python source"

	self assert: (self eval: 'x = 42
x') equals: 42.
	self assert: (self eval: 'x = 10
y = 20
x + y') equals: 30.
%

category: 'Tests - Eval - Variables'
method: IntegerTestCase
testEvalAugmentedAssignment
	"Test augmented assignment operators via Python source"

	self assert: (self eval: 'x = 10
x += 5
x') equals: 15.
	self assert: (self eval: 'x = 10
x -= 3
x') equals: 7.
	self assert: (self eval: 'x = 10
x *= 4
x') equals: 40.
	self assert: (self eval: 'x = 10
x //= 3
x') equals: 3.
	self assert: (self eval: 'x = 10
x %= 3
x') equals: 1.
	self assert: (self eval: 'x = 2
x **= 10
x') equals: 1024.
%

category: 'Tests - Eval - Bitwise'
method: IntegerTestCase
testEvalBitwise
	"Test bitwise operations via Python source"

	self assert: (self eval: '12 & 10') equals: 8.
	self assert: (self eval: '12 | 10') equals: 14.
	self assert: (self eval: '12 ^ 10') equals: 6.
	self assert: (self eval: '~0') equals: -1.
	self assert: (self eval: '5 << 2') equals: 20.
	self assert: (self eval: '20 >> 2') equals: 5.
%

category: 'Tests - Eval - Comparison'
method: IntegerTestCase
testEvalComparison
	"Test integer comparisons via Python source"

	self assert: (self eval: '3 < 5').
	self deny: (self eval: '5 < 3').
	self assert: (self eval: '5 <= 5').
	self assert: (self eval: '5 > 3').
	self assert: (self eval: '5 >= 5').
	self assert: (self eval: '5 == 5').
	self assert: (self eval: '5 != 3').
%

category: 'Tests - Eval - Comparison'
method: IntegerTestCase
testEvalChainedComparison
	"Test chained comparisons via Python source"

	self assert: (self eval: '1 < 5 < 10').
	self deny: (self eval: '1 < 5 < 3').
	self deny: (self eval: '5 < 1 < 10').
	self assert: (self eval: '1 <= 1 < 10').
	self assert: (self eval: '1 < 5 < 10 < 20').
	self deny: (self eval: '1 < 5 < 10 < 7').
	self assert: (self eval: '1 < 5 <= 5').
	self assert: (self eval: '1 != 2 != 3').
%

category: 'Tests - Eval - Comparison'
method: IntegerTestCase
testEvalChainedComparisonEvaluatesOnce
	"Test that middle operand is evaluated only once in chained comparison."

	self assert: (self eval: 'a = 1
a < (a := a + 1) < 3').
	self assert: (self eval: 'a = 1
a < (a := a + 1) < 3
a') equals: 2.
%

category: 'Tests - Eval - Variables'
method: IntegerTestCase
testEvalWalrusOperator
	"Test walrus operator (:=) via Python source"

	self assert: (self eval: '(x := 5)') equals: 5.
	self assert: (self eval: '(x := 3) + x') equals: 6.
%

category: 'Tests - Eval - Arithmetic'
method: IntegerTestCase
testEvalFloorDivNegative
	"Test floor division with negative numbers via Python source"

	self assert: (self eval: '-7 // 3') equals: -3.
	self assert: (self eval: '7 // -3') equals: -3.
%

category: 'Tests - Eval - Arithmetic'
method: IntegerTestCase
testEvalNegation
	"Test unary operators via Python source"

	self assert: (self eval: '-5') equals: -5.
	self assert: (self eval: '--5') equals: 5.
	self assert: (self eval: '+5') equals: 5.
%
