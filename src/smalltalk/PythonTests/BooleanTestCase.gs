! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BooleanTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BooleanTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BooleanTestCase category: 'SUnit'
%

set compile_env: 0

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__abs__
	"Test bool.__abs__()"

	self assert: (true perform: #__abs__ env: 1) equals: 1.
	self assert: (false perform: #__abs__ env: 1) equals: 0.
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__add__
	"Test bool.__add__()"

	"With integers"
	self assert: (true perform: #__add__: env: 1 withArguments: {5}) equals: 6.
	self assert: (false perform: #__add__: env: 1 withArguments: {5}) equals: 5.
	self assert: (true perform: #__add__: env: 1 withArguments: {true}) equals: 2.
	self assert: (false perform: #__add__: env: 1 withArguments: {false}) equals: 0.

	"With floats"
	self assert: (true perform: #__add__: env: 1 withArguments: {3.5}) equals: 4.5.
	self assert: (false perform: #__add__: env: 1 withArguments: {3.5}) equals: 3.5.
%

category: 'Tests - Bitwise'
method: BooleanTestCase
test__and__
	"Test bool.__and__() - bitwise AND"

	self assert: (true perform: #__and__: env: 1 withArguments: {1}) equals: 1.
	self assert: (true perform: #__and__: env: 1 withArguments: {0}) equals: 0.
	self assert: (false perform: #__and__: env: 1 withArguments: {1}) equals: 0.
%

category: 'Tests - Conversion'
method: BooleanTestCase
test__bool__
	"Test bool.__bool__()"

	self assert: (true perform: #__bool__ env: 1) equals: true.
	self assert: (false perform: #__bool__ env: 1) equals: false.
%

category: 'Tests - Documentation'
method: BooleanTestCase
test__doc__
	"Test bool.__doc__"

	| doc |
	doc := Boolean perform: #__doc__ env: 1.
	self assert: (doc isKindOf: Unicode7).
	self assert: (doc size > 0).
%

category: 'Tests - Comparison'
method: BooleanTestCase
test__eq__
	"Test bool.__eq__() - True==1 and False==0 in Python"

	self assert: (true perform: #__eq__: env: 1 withArguments: {1}).
	self assert: (false perform: #__eq__: env: 1 withArguments: {0}).
	self deny: (true perform: #__eq__: env: 1 withArguments: {0}).
	self deny: (false perform: #__eq__: env: 1 withArguments: {1}).
	self assert: (true perform: #__eq__: env: 1 withArguments: {true}).
	self assert: (false perform: #__eq__: env: 1 withArguments: {false}).
%

category: 'Tests - Conversion'
method: BooleanTestCase
test__float__
	"Test bool.__float__()"

	self assert: (true perform: #__float__ env: 1) equals: 1.0.
	self assert: (false perform: #__float__ env: 1) equals: 0.0.
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__floordiv__
	"Test bool.__floordiv__()"

	self assert: (true perform: #__floordiv__: env: 1 withArguments: {2}) equals: 0.
	self assert: (false perform: #__floordiv__: env: 1 withArguments: {2}) equals: 0.
%

category: 'Tests - Comparison'
method: BooleanTestCase
test__ge__
	"Test bool.__ge__()"

	self assert: (true perform: #__ge__: env: 1 withArguments: {1}).
	self assert: (false perform: #__ge__: env: 1 withArguments: {0}).
	self assert: (true perform: #__ge__: env: 1 withArguments: {0}).
%

category: 'Tests - Comparison'
method: BooleanTestCase
test__gt__
	"Test bool.__gt__()"

	self assert: (true perform: #__gt__: env: 1 withArguments: {0}).
	self deny: (false perform: #__gt__: env: 1 withArguments: {0}).
	self deny: (true perform: #__gt__: env: 1 withArguments: {1}).
%

category: 'Tests - Conversion'
method: BooleanTestCase
test__index__
	"Test bool.__index__()"

	self assert: (true perform: #__index__ env: 1) equals: 1.
	self assert: (false perform: #__index__ env: 1) equals: 0.
%

category: 'Tests - Conversion'
method: BooleanTestCase
test__int__
	"Test bool.__int__()"

	self assert: (true perform: #__int__ env: 1) equals: 1.
	self assert: (false perform: #__int__ env: 1) equals: 0.
%

category: 'Tests - Bitwise'
method: BooleanTestCase
test__invert__
	"Test bool.__invert__() - bitwise NOT"

	self assert: (true perform: #__invert__ env: 1) equals: -2.
	self assert: (false perform: #__invert__ env: 1) equals: -1.
%

category: 'Tests - Comparison'
method: BooleanTestCase
test__le__
	"Test bool.__le__()"

	self assert: (false perform: #__le__: env: 1 withArguments: {0}).
	self assert: (true perform: #__le__: env: 1 withArguments: {1}).
	self assert: (false perform: #__le__: env: 1 withArguments: {1}).
%

category: 'Tests - Comparison'
method: BooleanTestCase
test__lt__
	"Test bool.__lt__()"

	self assert: (false perform: #__lt__: env: 1 withArguments: {1}).
	self assert: (false perform: #__lt__: env: 1 withArguments: {true}).
	self deny: (true perform: #__lt__: env: 1 withArguments: {1}).
	self deny: (true perform: #__lt__: env: 1 withArguments: {0}).
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__mod__
	"Test bool.__mod__()"

	self assert: (true perform: #__mod__: env: 1 withArguments: {2}) equals: 1.
	self assert: (false perform: #__mod__: env: 1 withArguments: {2}) equals: 0.
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__mul__
	"Test bool.__mul__()"

	"With integers"
	self assert: (true perform: #__mul__: env: 1 withArguments: {5}) equals: 5.
	self assert: (false perform: #__mul__: env: 1 withArguments: {5}) equals: 0.
	self assert: (true perform: #__mul__: env: 1 withArguments: {true}) equals: 1.

	"With floats"
	self assert: (true perform: #__mul__: env: 1 withArguments: {2.5}) equals: 2.5.
	self assert: (false perform: #__mul__: env: 1 withArguments: {2.5}) equals: 0.0.
%

category: 'Tests - Comparison'
method: BooleanTestCase
test__ne__
	"Test bool.__ne__()"

	self deny: (true perform: #__ne__: env: 1 withArguments: {1}).
	self deny: (false perform: #__ne__: env: 1 withArguments: {0}).
	self assert: (true perform: #__ne__: env: 1 withArguments: {0}).
	self assert: (false perform: #__ne__: env: 1 withArguments: {1}).
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__neg__
	"Test bool.__neg__()"

	self assert: (true perform: #__neg__ env: 1) equals: -1.
	self assert: (false perform: #__neg__ env: 1) equals: 0.
%

category: 'Tests - Initialization'
method: BooleanTestCase
test__new__
	"Test bool() with no arguments returns False"

	| result |
	result := Boolean perform: #__new__ env: 1.
	self assert: result equals: false.
%

category: 'Tests - Initialization'
method: BooleanTestCase
test__new__fromBoolean
	"Test bool(bool) returns the same boolean"

	self assert: (Boolean ___new___: true) equals: true.
	self assert: (Boolean ___new___: false) equals: false.
%

category: 'Tests - Initialization'
method: BooleanTestCase
test__new__fromFloat
	"Test bool(float) conversion"

	self assert: (Boolean ___new___: 0.0) equals: false.
	self assert: (Boolean ___new___: 1.0) equals: true.
	self assert: (Boolean ___new___: 3.14) equals: true.
	self assert: (Boolean ___new___: -0.5) equals: true.
%

category: 'Tests - Initialization'
method: BooleanTestCase
test__new__fromInteger
	"Test bool(int) conversion"

	self assert: (Boolean ___new___: 0) equals: false.
	self assert: (Boolean ___new___: 1) equals: true.
	self assert: (Boolean ___new___: 42) equals: true.
	self assert: (Boolean ___new___: -1) equals: true.
%

category: 'Tests - Initialization'
method: BooleanTestCase
test__new__fromString
	"Test bool(str) conversion"

	| emptyStr nonEmptyStr |
	emptyStr := '' asUnicodeString.
	nonEmptyStr := 'hello' asUnicodeString.
	
	self assert: (Boolean ___new___: emptyStr) equals: false.
	self assert: (Boolean ___new___: nonEmptyStr) equals: true.
%

category: 'Tests - Bitwise'
method: BooleanTestCase
test__or__
	"Test bool.__or__() - bitwise OR"

	self assert: (true perform: #__or__: env: 1 withArguments: {0}) equals: 1.
	self assert: (false perform: #__or__: env: 1 withArguments: {1}) equals: 1.
	self assert: (false perform: #__or__: env: 1 withArguments: {0}) equals: 0.
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__pos__
	"Test bool.__pos__()"

	self assert: (true perform: #__pos__ env: 1) equals: 1.
	self assert: (false perform: #__pos__ env: 1) equals: 0.
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__pow__
	"Test bool.__pow__()"

	self assert: (true perform: #__pow__: env: 1 withArguments: {5}) equals: 1.
	self assert: (false perform: #__pow__: env: 1 withArguments: {5}) equals: 0.
%

category: 'Tests - String Representation'
method: BooleanTestCase
test__repr__
	"Test bool.__repr__()"

	| result |
	result := true perform: #__repr__ env: 1.
	self assert: (result isKindOf: Unicode7).
	self assert: result equals: 'True' asUnicodeString.
	
	result := false perform: #__repr__ env: 1.
	self assert: (result isKindOf: Unicode7).
	self assert: result equals: 'False' asUnicodeString.
%

category: 'Tests - String Representation'
method: BooleanTestCase
test__str__
	"Test bool.__str__()"

	| result |
	result := true perform: #__str__ env: 1.
	self assert: result equals: 'True' asUnicodeString.
	
	result := false perform: #__str__ env: 1.
	self assert: result equals: 'False' asUnicodeString.
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__sub__
	"Test bool.__sub__()"

	"With integers"
	self assert: (true perform: #__sub__: env: 1 withArguments: {1}) equals: 0.
	self assert: (false perform: #__sub__: env: 1 withArguments: {1}) equals: -1.

	"With floats"
	self assert: (true perform: #__sub__: env: 1 withArguments: {0.5}) equals: 0.5.
	self assert: (false perform: #__sub__: env: 1 withArguments: {0.5}) equals: -0.5.
%

category: 'Tests - Arithmetic'
method: BooleanTestCase
test__truediv__
	"Test bool.__truediv__()"

	self assert: (true perform: #__truediv__: env: 1 withArguments: {2}) equals: 0.5.
	self assert: (false perform: #__truediv__: env: 1 withArguments: {2}) equals: 0.0.
%

category: 'Tests - Bitwise'
method: BooleanTestCase
test__xor__
	"Test bool.__xor__() - bitwise XOR"

	self assert: (true perform: #__xor__: env: 1 withArguments: {1}) equals: 0.
	self assert: (true perform: #__xor__: env: 1 withArguments: {0}) equals: 1.
	self assert: (false perform: #__xor__: env: 1 withArguments: {1}) equals: 1.
%

category: 'Tests - Smalltalk Coercion'
method: BooleanTestCase
test_coerce
	"Test Boolean._coerce: for numeric coercion"

	| result |
	"Coercing an integer should return the integer"
	result := true _coerce: 5.
	self assert: result equals: 5.

	"Coercing a float should truncate it to integer"
	result := true _coerce: 3.7.
	self assert: result equals: 3.

	"Coercing a negative float"
	result := false _coerce: -2.5.
	self assert: result equals: -2.
%

category: 'Tests - Smalltalk Coercion'
method: BooleanTestCase
test_generality
	"Test Boolean._generality for numeric coercion"

	"Boolean should have lowest generality (10) so it gets coerced to other types"
	self assert: true _generality equals: 10.
	self assert: false _generality equals: 10.

	"Verify it's lower than SmallInteger (20) and Integer (40)"
	self assert: true _generality < 20.
%

category: 'Tests - Smalltalk Arithmetic'
method: BooleanTestCase
testAbs
	"Test Boolean.abs"

	self assert: true abs equals: 1.
	self assert: false abs equals: 0.
%

category: 'Tests - Arithmetic with Coercion'
method: BooleanTestCase
testArithmeticWithFloat
	"Test that Boolean arithmetic with Float works via coercion (reverse operations)"

	| result |
	"When Float is on the left, it uses Float's operators with Boolean coercion"
	result := 3.5 + true.
	self assert: result equals: 4.5.

	result := 3.5 + false.
	self assert: result equals: 3.5.

	result := 2.5 * true.
	self assert: result equals: 2.5.

	result := 2.5 * false.
	self assert: result equals: 0.0.
%

category: 'Tests - Arithmetic with Coercion'
method: BooleanTestCase
testArithmeticWithInteger
	"Test that Boolean arithmetic with Integer works via coercion (reverse operations)"

	"When Integer is on the left, it uses Integer's operators with Boolean coercion"
	self assert: 5 + true equals: 6.
	self assert: 5 + false equals: 5.
	self assert: 5 - true equals: 4.
	self assert: 5 * true equals: 5.
	self assert: 5 * false equals: 0.
%

category: 'Tests - Smalltalk Conversion'
method: BooleanTestCase
testAsFloat
	"Test Boolean.asFloat"

	self assert: true asFloat equals: 1.0.
	self assert: false asFloat equals: 0.0.
%

category: 'Tests - Smalltalk Conversion'
method: BooleanTestCase
testAsFraction
	"Test Boolean.asFraction"

	self assert: true asFraction equals: 1.
	self assert: false asFraction equals: 0.
%

category: 'Tests - Smalltalk Conversion'
method: BooleanTestCase
testAsInteger
	"Test Boolean.asInteger"

	self assert: true asInteger equals: 1.
	self assert: false asInteger equals: 0.
%

category: 'Tests - Smalltalk Conversion'
method: BooleanTestCase
testCeiling
	"Test Boolean.ceiling"

	self assert: true ceiling equals: 1.
	self assert: false ceiling equals: 0.
%

category: 'Tests - Eval - And'
method: BooleanTestCase
testEvalAnd
	"Test and operator via Python source"

	self assert: (self eval: 'True and True').
	self deny: (self eval: 'True and False').
	self deny: (self eval: 'False and True').
	self deny: (self eval: 'False and False').
%

category: 'Tests - Eval - And'
method: BooleanTestCase
testEvalChainedAnd
	"Test chained and operator via Python source"

	self assert: (self eval: 'True and True and True').
	self deny: (self eval: 'True and False and True').
	self deny: (self eval: 'False and True and True').
	self deny: (self eval: 'True and True and False').
%

category: 'Tests - Eval - Or'
method: BooleanTestCase
testEvalChainedOr
	"Test chained or operator via Python source"

	self assert: (self eval: 'True or False or False').
	self assert: (self eval: 'False or True or False').
	self assert: (self eval: 'False or False or True').
	self deny: (self eval: 'False or False or False').
%

category: 'Tests - Eval - Arithmetic'
method: BooleanTestCase
testEvalBoolArithmetic
	"Test boolean arithmetic via Python source"

	self assert: (self eval: 'True + True') equals: 2.
	self assert: (self eval: 'True + False') equals: 1.
	self assert: (self eval: 'True * 5') equals: 5.
	self assert: (self eval: 'False * 5') equals: 0.
%

category: 'Tests - Eval - Comparison'
method: BooleanTestCase
testEvalBooleanComparison
	"Test boolean comparisons via Python source"

	self assert: (self eval: 'True == True').
	self assert: (self eval: 'False == False').
	self assert: (self eval: 'True != False').
%

category: 'Tests - Eval - Literals'
method: BooleanTestCase
testEvalBooleanLiterals
	"Test True and False literals via Python source"

	self assert: (self eval: 'True').
	self deny: (self eval: 'False').
%

category: 'Tests - Eval - Combined'
method: BooleanTestCase
testEvalCombinedLogic
	"Test combined boolean logic via Python source"

	self assert: (self eval: '3 < 5 and 5 > 1').
	self deny: (self eval: '3 > 5 and 5 > 1').
	self assert: (self eval: '3 > 5 or 5 > 1').
	self assert: (self eval: 'not (3 > 5)').
%

category: 'Tests - Eval - IfExp'
method: BooleanTestCase
testEvalIfExpression
	"Test ternary if expression via Python source"

	self assert: (self eval: '1 if True else 2') equals: 1.
	self assert: (self eval: '1 if False else 2') equals: 2.
	self assert: (self eval: '"yes" if 3 > 2 else "no"') equals: 'yes'.
%

category: 'Tests - Eval - Truthiness'
method: BooleanTestCase
testIfTruthyInt
	"if <non-zero int>: should take the true branch."

	self assert: (self eval:
'x = 1
if x:
    result = "truthy"
else:
    result = "falsy"
result
') equals: 'truthy'.
%

category: 'Tests - Eval - Truthiness'
method: BooleanTestCase
testIfFalsyZero
	"if 0: should take the false branch."

	self assert: (self eval:
'x = 0
if x:
    result = "truthy"
else:
    result = "falsy"
result
') equals: 'falsy'.
%

category: 'Tests - Eval - Truthiness'
method: BooleanTestCase
testIfTruthyString
	"if <non-empty string>: should take the true branch."

	self assert: (self eval:
'x = "hello"
if x:
    result = "truthy"
else:
    result = "falsy"
result
') equals: 'truthy'.
%

category: 'Tests - Eval - Truthiness'
method: BooleanTestCase
testIfFalsyEmptyString
	"if '''': should take the false branch."

	self assert: (self eval:
'x = ""
if x:
    result = "truthy"
else:
    result = "falsy"
result
') equals: 'falsy'.
%

category: 'Tests - Eval - Truthiness'
method: BooleanTestCase
testWhileTruthyCountdown
	"while with integer truthiness should loop until zero."

	self assert: (self eval:
'n = 3
result = 0
while n:
    result = result + n
    n = n - 1
result
') equals: 6.
%

category: 'Tests - Eval - Not'
method: BooleanTestCase
testEvalNot
	"Test not operator via Python source"

	self deny: (self eval: 'not True').
	self assert: (self eval: 'not False').
%

category: 'Tests - Eval - Or'
method: BooleanTestCase
testEvalOr
	"Test or operator via Python source"

	self assert: (self eval: 'True or True').
	self assert: (self eval: 'True or False').
	self assert: (self eval: 'False or True').
	self deny: (self eval: 'False or False').
%

category: 'Tests - Smalltalk Testing'
method: BooleanTestCase
testEven
	"Test Boolean.even"

	self deny: true even.
	self assert: false even.
%

category: 'Tests - Smalltalk Conversion'
method: BooleanTestCase
testFloor
	"Test Boolean.floor"

	self assert: true floor equals: 1.
	self assert: false floor equals: 0.
%

category: 'Tests - Smalltalk Coercion'
method: BooleanTestCase
testIsNumber
	"Test Boolean.isNumber (not _isNumber which is an optimized selector)"

	"isNumber can be overridden, unlike _isNumber"
	self assert: true isNumber.
	self assert: false isNumber.
%

category: 'Tests - Smalltalk Arithmetic'
method: BooleanTestCase
testNegated
	"Test Boolean.negated"

	self assert: true negated equals: -1.
	self assert: false negated equals: 0.
%

category: 'Tests - Smalltalk Testing'
method: BooleanTestCase
testNegative
	"Test Boolean.negative"

	self deny: true negative.
	self deny: false negative.
%

category: 'Tests - Smalltalk Testing'
method: BooleanTestCase
testOdd
	"Test Boolean.odd"

	self assert: true odd.
	self deny: false odd.
%

category: 'Tests - Smalltalk Testing'
method: BooleanTestCase
testPositive
	"Test Boolean.positive"

	self assert: true positive.
	self assert: false positive.
%

category: 'Tests - Smalltalk Arithmetic'
method: BooleanTestCase
testReciprocal
	"Test Boolean.reciprocal"

	self assert: true reciprocal equals: 1.
	"false.reciprocal would raise ZeroDivide error"
%

category: 'Tests - Smalltalk Conversion'
method: BooleanTestCase
testRounded
	"Test Boolean.rounded"

	self assert: true rounded equals: 1.
	self assert: false rounded equals: 0.
%

category: 'Tests - Smalltalk Arithmetic'
method: BooleanTestCase
testSign
	"Test Boolean.sign"

	self assert: true sign equals: 1.
	self assert: false sign equals: 0.
%

category: 'Tests - Smalltalk Operators'
method: BooleanTestCase
testSmalltalkArithmeticOperators
	"Test Smalltalk arithmetic operators on Boolean"

	"Addition"
	self assert: true + 5 equals: 6.
	self assert: false + 5 equals: 5.
	self assert: true + 3.5 equals: 4.5.

	"Subtraction"
	self assert: true - 1 equals: 0.
	self assert: false - 1 equals: -1.

	"Multiplication"
	self assert: true * 5 equals: 5.
	self assert: false * 5 equals: 0.
	self assert: true * 2.5 equals: 2.5.

	"Division"
	self assert: true / 2 equals: 0.5.
	self assert: false / 2 equals: 0.0.

	"Integer division"
	self assert: true // 2 equals: 0.
	self assert: true // 1 equals: 1.

	"Modulo"
	self assert: true \\ 2 equals: 1.
	self assert: false \\ 2 equals: 0.

	"Power (raisedTo:)"
	self assert: (true raisedTo: 5) equals: 1.
	self assert: (false raisedTo: 5) equals: 0.
	self assert: (true raisedToInteger: 3) equals: 1.
	self assert: (false raisedToInteger: 3) equals: 0.
%

category: 'Tests - Smalltalk Operators'
method: BooleanTestCase
testSmalltalkComparisonOperators
	"Test Smalltalk comparison operators on Boolean"

	"Less than with numbers"
	self assert: false < 1.
	self deny: true < 1.

	"Less than with booleans"
	self assert: false < true.
	self deny: true < false.
	self deny: true < true.

	"Less than or equal with numbers"
	self assert: true <= 1.
	self assert: false <= 0.

	"Less than or equal with booleans"
	self assert: false <= true.
	self assert: true <= true.
	self assert: false <= false.

	"Greater than with numbers"
	self assert: true > 0.
	self deny: false > 0.

	"Greater than with booleans"
	self assert: true > false.
	self deny: false > true.
	self deny: true > true.

	"Greater than or equal with numbers"
	self assert: true >= 1.
	self assert: false >= 0.

	"Greater than or equal with booleans"
	self assert: true >= false.
	self assert: true >= true.
	self assert: false >= false.

	"Equality with numbers"
	self assert: true = 1.
	self assert: false = 0.

	"Equality with booleans"
	self assert: true = true.
	self assert: false = false.
	self deny: true = false.

	"Inequality with numbers"
	self assert: true ~= 0.
	self assert: false ~= 1.

	"Inequality with booleans"
	self assert: true ~= false.
	self deny: true ~= true.
	self deny: false ~= false.
%

category: 'Tests - Smalltalk Operators'
method: BooleanTestCase
testSmalltalkComparisonsWithBooleans
	"Test that Boolean-to-Boolean comparisons work in Smalltalk.
	Note: Number-to-Boolean comparisons (e.g., 1 = true) don't work in Smalltalk
	because Integer's = primitive doesn't recognize Boolean as a Number.
	Use Python's __eq__: for cross-type comparisons."

	"Boolean to Boolean"
	self assert: true = true.
	self assert: false = false.
	self deny: true = false.

	"Boolean to Number (Boolean's = handles this)"
	self assert: true = 1.
	self assert: false = 0.
	self deny: true = 0.
	self deny: false = 1.
%

category: 'Tests - Smalltalk Operators'
method: BooleanTestCase
testSmalltalkMinMax
	"Test Smalltalk min/max operators on Boolean"

	self assert: (true min: 5) equals: 1.
	self assert: (true max: 5) equals: 5.
	self assert: (false min: 5) equals: 0.
	self assert: (false max: 5) equals: 5.
%

category: 'Tests - Smalltalk Testing'
method: BooleanTestCase
testStrictlyPositive
	"Test Boolean.strictlyPositive"

	self assert: true strictlyPositive.
	self deny: false strictlyPositive.
%

category: 'Tests - Smalltalk Conversion'
method: BooleanTestCase
testTruncated
	"Test Boolean.truncated"

	self assert: true truncated equals: 1.
	self assert: false truncated equals: 0.
%

category: 'Tests - Type Identity'
method: BooleanTestCase
testTypeIdentity
	"Test that True and False have the correct type"

	"In Python, type(True) is bool, not int"
	self assert: (true class) equals: Boolean.
	self assert: (false class) equals: Boolean.

	"But True == 1 and False == 0"
	self assert: (true perform: #__eq__: env: 1 withArguments: {1}).
	self assert: (false perform: #__eq__: env: 1 withArguments: {0}).
%
