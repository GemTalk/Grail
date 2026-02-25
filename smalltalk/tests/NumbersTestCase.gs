! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NumbersTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NumbersTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NumbersTestCase category: 'SUnit'
%

! ===============================================================================
! NumbersTestCase - Tests for Python numbers module (PEP 3141)
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NumbersTestCase removeAllMethods.
NumbersTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Tests - isinstance Integral'
method: NumbersTestCase
testBoolIsInstanceOfIntegral
	"Test isinstance(True, numbers.Integral) returns True (bool is subclass of int)"

	self assert: (numbers_Integral perform: #__instancecheck__: env: 1 withArguments: {true}).
	self assert: (numbers_Integral perform: #__instancecheck__: env: 1 withArguments: {false}).
%

category: 'Tests - isinstance Complex'
method: NumbersTestCase
testComplexIsInstanceOfComplex
	"Test isinstance(complex(1,2), numbers.Complex) returns True"

	| c |
	c := complex perform: #__new__:_: env: 1 withArguments: {1.0. 2.0}.
	self assert: (numbers_Complex perform: #__instancecheck__: env: 1 withArguments: {c}).
%

category: 'Tests - isinstance Number'
method: NumbersTestCase
testComplexIsInstanceOfNumber
	"Test isinstance(complex(1,2), numbers.Number) returns True"

	| c |
	c := complex perform: #__new__:_: env: 1 withArguments: {1.0. 2.0}.
	self assert: (numbers_Number perform: #__instancecheck__: env: 1 withArguments: {c}).
%

category: 'Tests - ABC Hierarchy'
method: NumbersTestCase
testComplexIsSubclassOfNumber
	"Test that Complex is a subclass of Number"

	self assert: (numbers_Complex isSubclassOf: numbers_Number).
%

category: 'Tests - isinstance Complex'
method: NumbersTestCase
testFloatIsInstanceOfComplex
	"Test isinstance(3.14, numbers.Complex) returns True (Real is subclass of Complex)"

	self assert: (numbers_Complex perform: #__instancecheck__: env: 1 withArguments: {3.14}).
%

category: 'Tests - isinstance Number'
method: NumbersTestCase
testFloatIsInstanceOfNumber
	"Test isinstance(3.14, numbers.Number) returns True"

	self assert: (numbers_Number perform: #__instancecheck__: env: 1 withArguments: {3.14}).
%

category: 'Tests - isinstance Real'
method: NumbersTestCase
testFloatIsInstanceOfReal
	"Test isinstance(3.14, numbers.Real) returns True"

	self assert: (numbers_Real perform: #__instancecheck__: env: 1 withArguments: {3.14}).
%

category: 'Tests - isinstance Integral'
method: NumbersTestCase
testFloatIsNotInstanceOfIntegral
	"Test isinstance(3.14, numbers.Integral) returns False"

	self deny: (numbers_Integral perform: #__instancecheck__: env: 1 withArguments: {3.14}).
%

category: 'Tests - isinstance Rational'
method: NumbersTestCase
testFractionIsInstanceOfRational
	"Test isinstance(Fraction(1,2), numbers.Rational) returns True"

	| frac |
	frac := Fraction perform: #__new__:_:_: env: 1 withArguments: {Fraction. 1. 2}.
	self assert: (numbers_Rational perform: #__instancecheck__: env: 1 withArguments: {frac}).
%

category: 'Tests - isinstance Complex'
method: NumbersTestCase
testIntegerIsInstanceOfComplex
	"Test isinstance(5, numbers.Complex) returns True"

	self assert: (numbers_Complex perform: #__instancecheck__: env: 1 withArguments: {5}).
%

category: 'Tests - isinstance Integral'
method: NumbersTestCase
testIntegerIsInstanceOfIntegral
	"Test isinstance(5, numbers.Integral) returns True"

	self assert: (numbers_Integral perform: #__instancecheck__: env: 1 withArguments: {5}).
%

category: 'Tests - isinstance Number'
method: NumbersTestCase
testIntegerIsInstanceOfNumber
	"Test isinstance(5, numbers.Number) returns True"

	self assert: (numbers_Number perform: #__instancecheck__: env: 1 withArguments: {5}).
%

category: 'Tests - isinstance Rational'
method: NumbersTestCase
testIntegerIsInstanceOfRational
	"Test isinstance(5, numbers.Rational) returns True (Integral is subclass of Rational)"

	self assert: (numbers_Rational perform: #__instancecheck__: env: 1 withArguments: {5}).
%

category: 'Tests - isinstance Real'
method: NumbersTestCase
testIntegerIsInstanceOfReal
	"Test isinstance(5, numbers.Real) returns True (Integral is subclass of Real)"

	self assert: (numbers_Real perform: #__instancecheck__: env: 1 withArguments: {5}).
%

category: 'Tests - ABC Hierarchy'
method: NumbersTestCase
testIntegralIsSubclassOfRational
	"Test that Integral is a subclass of Rational"

	self assert: (numbers_Integral isSubclassOf: numbers_Rational).
%

category: 'Tests - isinstance Number'
method: NumbersTestCase
testListIsNotInstanceOfNumber
	"Test isinstance([1,2,3], numbers.Number) returns False"

	| lst |
	lst := OrderedCollection new.
	lst add: 1; add: 2; add: 3.
	self deny: (numbers_Number perform: #__instancecheck__: env: 1 withArguments: {lst}).
%

category: 'Tests - Module Access'
method: NumbersTestCase
testNumbersModuleExists
	"Test that numbers module exists and can be accessed"
	
	| nm |
	nm := numbers perform: #instance env: 1.
	self assert: nm notNil.
%

category: 'Tests - Module Access'
method: NumbersTestCase
testNumbersModuleProvidesComplex
	"Test that numbers module exposes the Complex ABC"
	
	| nm complexABC |
	nm := numbers perform: #instance env: 1.
	complexABC := nm perform: #Complex env: 1.
	self assert: complexABC equals: numbers_Complex.
%

category: 'Tests - Module Access'
method: NumbersTestCase
testNumbersModuleProvidesIntegral
	"Test that numbers module exposes the Integral ABC"
	
	| nm integralABC |
	nm := numbers perform: #instance env: 1.
	integralABC := nm perform: #Integral env: 1.
	self assert: integralABC equals: numbers_Integral.
%

category: 'Tests - Module Access'
method: NumbersTestCase
testNumbersModuleProvidesNumber
	"Test that numbers module exposes the Number ABC"
	
	| nm numberABC |
	nm := numbers perform: #instance env: 1.
	numberABC := nm perform: #Number env: 1.
	self assert: numberABC equals: numbers_Number.
%

category: 'Tests - Module Access'
method: NumbersTestCase
testNumbersModuleProvidesRational
	"Test that numbers module exposes the Rational ABC"
	
	| nm rationalABC |
	nm := numbers perform: #instance env: 1.
	rationalABC := nm perform: #Rational env: 1.
	self assert: rationalABC equals: numbers_Rational.
%

category: 'Tests - Module Access'
method: NumbersTestCase
testNumbersModuleProvidesReal
	"Test that numbers module exposes the Real ABC"
	
	| nm realABC |
	nm := numbers perform: #instance env: 1.
	realABC := nm perform: #Real env: 1.
	self assert: realABC equals: numbers_Real.
%

category: 'Tests - ABC Hierarchy'
method: NumbersTestCase
testRationalIsSubclassOfReal
	"Test that Rational is a subclass of Real"

	self assert: (numbers_Rational isSubclassOf: numbers_Real).
%

category: 'Tests - ABC Hierarchy'
method: NumbersTestCase
testRealIsSubclassOfComplex
	"Test that Real is a subclass of Complex"

	self assert: (numbers_Real isSubclassOf: numbers_Complex).
%

category: 'Tests - isinstance Integral'
method: NumbersTestCase
testSmallIntegerIsInstanceOfIntegral
	"Test isinstance(SmallInteger, numbers.Integral) returns True"

	self assert: (numbers_Integral perform: #__instancecheck__: env: 1 withArguments: {42}).
%

category: 'Tests - isinstance Number'
method: NumbersTestCase
testStringIsNotInstanceOfNumber
	"Test isinstance('hello', numbers.Number) returns False"

	self deny: (numbers_Number perform: #__instancecheck__: env: 1 withArguments: {'hello'}).
%
