! ===============================================================================
! DecimalTestCase - Tests for Python Decimal type
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
DecimalTestCase removeAllMethods: 0.
DecimalTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for DecimalTestCase

category: 'Tests - Creation'
method: DecimalTestCase
testCreateFromString
	"Test creating Decimal from string"

	| d |
	d := (Decimal ___new___: Decimal _: '123.45').
	
	self assert: (d perform: #__str__ env: 2) equals: '123.45'
%

category: 'Tests - Creation'
method: DecimalTestCase
testCreateFromInteger
	"Test creating Decimal from integer"

	| d |
	d := (Decimal ___new___: Decimal _: 42).
	
	self assert: (d perform: #__int__ env: 2) = 42
%

category: 'Tests - Creation'
method: DecimalTestCase
testCreateFromFloat
	"Test creating Decimal from float"

	| d |
	d := (Decimal ___new___: Decimal _: 3.14).
	
	"Float conversion may not be exact, so just check it's close"
	self assert: ((d perform: #__float__ env: 2) - 3.14) abs < 0.01
%

category: 'Tests - Arithmetic'
method: DecimalTestCase
testAddition
	"Test Decimal addition"

	| d1 d2 result |
	d1 := (Decimal ___new___: Decimal _: '10.5').
	d2 := (Decimal ___new___: Decimal _: '20.3').
	
	result := (d1 perform: #__add__: env: 2 withArguments: {d2}).
	
	self assert: (d1 perform: #__str__ env: 2) equals: '10.5'.
	self assert: (d2 perform: #__str__ env: 2) equals: '20.3'.
	self assert: (result perform: #__str__ env: 2) equals: '30.8'
%

category: 'Tests - Arithmetic'
method: DecimalTestCase
testSubtraction
	"Test Decimal subtraction"

	| d1 d2 result |
	d1 := (Decimal ___new___: Decimal _: '50.7').
	d2 := (Decimal ___new___: Decimal _: '20.3').
	
	result := (d1 perform: #__sub__: env: 2 withArguments: {d2}).
	
	self assert: (result perform: #__str__ env: 2) equals: '30.4'
%

category: 'Tests - Arithmetic'
method: DecimalTestCase
testMultiplication
	"Test Decimal multiplication"

	| d1 d2 result |
	d1 := (Decimal ___new___: Decimal _: '3.5').
	d2 := (Decimal ___new___: Decimal _: '2.0').
	
	result := (d1 perform: #__mul__: env: 2 withArguments: {d2}).
	
	self assert: (result perform: #__str__ env: 2) equals: '7.0'
%

category: 'Tests - Arithmetic'
method: DecimalTestCase
testDivision
	"Test Decimal division"

	| d1 d2 result |
	d1 := (Decimal ___new___: Decimal _: '10.0').
	d2 := (Decimal ___new___: Decimal _: '4.0').
	
	result := (d1 perform: #__truediv__: env: 2 withArguments: {d2}).
	
	self assert: (result perform: #__str__ env: 2) equals: '2.5'
%

category: 'Tests - Arithmetic'
method: DecimalTestCase
testNegation
	"Test Decimal negation"

	| d result |
	d := (Decimal ___new___: Decimal _: '42.5').
	
	result := (d perform: #__neg__ env: 2).
	
	self assert: (result perform: #__str__ env: 2) equals: '-42.5'
%

category: 'Tests - Arithmetic'
method: DecimalTestCase
testAbsoluteValue
	"Test Decimal absolute value"

	| d result |
	d := (Decimal ___new___: Decimal _: '-42.5').
	
	result := (d perform: #__abs__ env: 2).
	
	self assert: (result perform: #__str__ env: 2) equals: '42.5'
%

category: 'Tests - Comparison'
method: DecimalTestCase
testEquality
	"Test Decimal equality"

	| d1 d2 d3 |
	d1 := (Decimal ___new___: Decimal _: '42.5').
	d2 := (Decimal ___new___: Decimal _: '42.5').
	d3 := (Decimal ___new___: Decimal _: '42.6').
	
	self assert: (d1 perform: #__eq__: env: 2 withArguments: {d2}).
	self deny: (d1 perform: #__eq__: env: 2 withArguments: {d3})
%

category: 'Tests - Comparison'
method: DecimalTestCase
testLessThan
	"Test Decimal less than comparison"

	| d1 d2 |
	d1 := (Decimal ___new___: Decimal _: '10.5').
	d2 := (Decimal ___new___: Decimal _: '20.3').
	
	self assert: (d1 perform: #__lt__: env: 2 withArguments: {d2}).
	self deny: (d2 perform: #__lt__: env: 2 withArguments: {d1})
%

