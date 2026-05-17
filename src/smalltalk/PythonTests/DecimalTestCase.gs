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
