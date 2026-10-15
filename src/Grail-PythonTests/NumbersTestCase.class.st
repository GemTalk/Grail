Class {
	#name : 'NumbersTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - isinstance Integral' }
NumbersTestCase >> testBoolIsInstanceOfIntegral [
	"Test isinstance(True, numbers.Integral) returns True (bool is subclass of int)"

	self assert: (numbers_Integral @env1:__instancecheck__: true).
	self assert: (numbers_Integral @env1:__instancecheck__: false).

]

{ #category : 'Grail-Tests - isinstance Complex' }
NumbersTestCase >> testComplexIsInstanceOfComplex [
	"Test isinstance(complex(1,2), numbers.Complex) returns True"

	| c |
	c := complex @env1:__new__: 1.0 _: 2.0.
	self assert: (numbers_Complex @env1:__instancecheck__: c).

]

{ #category : 'Grail-Tests - isinstance Number' }
NumbersTestCase >> testComplexIsInstanceOfNumber [
	"Test isinstance(complex(1,2), numbers.Number) returns True"

	| c |
	c := complex @env1:__new__: 1.0 _: 2.0.
	self assert: (numbers_Number @env1:__instancecheck__: c).

]

{ #category : 'Grail-Tests - ABC Hierarchy' }
NumbersTestCase >> testComplexIsSubclassOfNumber [
	"Test that Complex is a subclass of Number"

	self assert: (numbers_Complex isSubclassOf: numbers_Number).

]

{ #category : 'Grail-Tests - isinstance Complex' }
NumbersTestCase >> testFloatIsInstanceOfComplex [
	"Test isinstance(3.14, numbers.Complex) returns True (Real is subclass of Complex)"

	self assert: (numbers_Complex @env1:__instancecheck__: 3.14).

]

{ #category : 'Grail-Tests - isinstance Number' }
NumbersTestCase >> testFloatIsInstanceOfNumber [
	"Test isinstance(3.14, numbers.Number) returns True"

	self assert: (numbers_Number @env1:__instancecheck__: 3.14).

]

{ #category : 'Grail-Tests - isinstance Real' }
NumbersTestCase >> testFloatIsInstanceOfReal [
	"Test isinstance(3.14, numbers.Real) returns True"

	self assert: (numbers_Real @env1:__instancecheck__: 3.14).

]

{ #category : 'Grail-Tests - isinstance Integral' }
NumbersTestCase >> testFloatIsNotInstanceOfIntegral [
	"Test isinstance(3.14, numbers.Integral) returns False"

	self deny: (numbers_Integral @env1:__instancecheck__: 3.14).

]

{ #category : 'Grail-Tests - isinstance Rational' }
NumbersTestCase >> testFractionIsInstanceOfRational [
	"Test isinstance(Fraction(1,2), numbers.Rational) returns True"

	| frac |
	frac := Fraction @env1:__new__: Fraction _: 1 _: 2.
	self assert: (numbers_Rational @env1:__instancecheck__: frac).

]

{ #category : 'Grail-Tests - isinstance Complex' }
NumbersTestCase >> testIntegerIsInstanceOfComplex [
	"Test isinstance(5, numbers.Complex) returns True"

	self assert: (numbers_Complex @env1:__instancecheck__: 5).

]

{ #category : 'Grail-Tests - isinstance Integral' }
NumbersTestCase >> testIntegerIsInstanceOfIntegral [
	"Test isinstance(5, numbers.Integral) returns True"

	self assert: (numbers_Integral @env1:__instancecheck__: 5).

]

{ #category : 'Grail-Tests - isinstance Number' }
NumbersTestCase >> testIntegerIsInstanceOfNumber [
	"Test isinstance(5, numbers.Number) returns True"

	self assert: (numbers_Number @env1:__instancecheck__: 5).

]

{ #category : 'Grail-Tests - isinstance Rational' }
NumbersTestCase >> testIntegerIsInstanceOfRational [
	"Test isinstance(5, numbers.Rational) returns True (Integral is subclass of Rational)"

	self assert: (numbers_Rational @env1:__instancecheck__: 5).

]

{ #category : 'Grail-Tests - isinstance Real' }
NumbersTestCase >> testIntegerIsInstanceOfReal [
	"Test isinstance(5, numbers.Real) returns True (Integral is subclass of Real)"

	self assert: (numbers_Real @env1:__instancecheck__: 5).

]

{ #category : 'Grail-Tests - ABC Hierarchy' }
NumbersTestCase >> testIntegralIsSubclassOfRational [
	"Test that Integral is a subclass of Rational"

	self assert: (numbers_Integral isSubclassOf: numbers_Rational).

]

{ #category : 'Grail-Tests - isinstance Number' }
NumbersTestCase >> testListIsNotInstanceOfNumber [
	"Test isinstance([1,2,3], numbers.Number) returns False"

	| lst |
	lst := OrderedCollection new.
	lst add: 1; add: 2; add: 3.
	self deny: (numbers_Number @env1:__instancecheck__: lst).

]

{ #category : 'Grail-Tests - Module Access' }
NumbersTestCase >> testNumbersModuleExists [
	"Test that numbers module exists and can be accessed"
	
	| nm |
	nm := numbers @env1:instance.
	self assert: nm notNil.

]

{ #category : 'Grail-Tests - Module Access' }
NumbersTestCase >> testNumbersModuleProvidesComplex [
	"Test that numbers module exposes the Complex ABC"
	
	| nm complexABC |
	nm := numbers @env1:instance.
	complexABC := nm @env1:Complex.
	self assert: complexABC equals: numbers_Complex.

]

{ #category : 'Grail-Tests - Module Access' }
NumbersTestCase >> testNumbersModuleProvidesIntegral [
	"Test that numbers module exposes the Integral ABC"
	
	| nm integralABC |
	nm := numbers @env1:instance.
	integralABC := nm @env1:Integral.
	self assert: integralABC equals: numbers_Integral.

]

{ #category : 'Grail-Tests - Module Access' }
NumbersTestCase >> testNumbersModuleProvidesNumber [
	"Test that numbers module exposes the Number ABC"
	
	| nm numberABC |
	nm := numbers @env1:instance.
	numberABC := nm @env1:Number.
	self assert: numberABC equals: numbers_Number.

]

{ #category : 'Grail-Tests - Module Access' }
NumbersTestCase >> testNumbersModuleProvidesRational [
	"Test that numbers module exposes the Rational ABC"
	
	| nm rationalABC |
	nm := numbers @env1:instance.
	rationalABC := nm @env1:Rational.
	self assert: rationalABC equals: numbers_Rational.

]

{ #category : 'Grail-Tests - Module Access' }
NumbersTestCase >> testNumbersModuleProvidesReal [
	"Test that numbers module exposes the Real ABC"
	
	| nm realABC |
	nm := numbers @env1:instance.
	realABC := nm @env1:Real.
	self assert: realABC equals: numbers_Real.

]

{ #category : 'Grail-Tests - ABC Hierarchy' }
NumbersTestCase >> testRationalIsSubclassOfReal [
	"Test that Rational is a subclass of Real"

	self assert: (numbers_Rational isSubclassOf: numbers_Real).

]

{ #category : 'Grail-Tests - ABC Hierarchy' }
NumbersTestCase >> testRealIsSubclassOfComplex [
	"Test that Real is a subclass of Complex"

	self assert: (numbers_Real isSubclassOf: numbers_Complex).

]

{ #category : 'Grail-Tests - isinstance Integral' }
NumbersTestCase >> testSmallIntegerIsInstanceOfIntegral [
	"Test isinstance(SmallInteger, numbers.Integral) returns True"

	self assert: (numbers_Integral @env1:__instancecheck__: 42).

]

{ #category : 'Grail-Tests - isinstance Number' }
NumbersTestCase >> testStringIsNotInstanceOfNumber [
	"Test isinstance('hello', numbers.Number) returns False"

	self deny: (numbers_Number @env1:__instancecheck__: 'hello').

]
