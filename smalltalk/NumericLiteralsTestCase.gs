! ------------------- Remove existing behavior from NumericLiteralsTestCase
expectvalue /Metaclass3       
doit
NumericLiteralsTestCase removeAllMethods.
NumericLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for NumericLiteralsTestCase
set compile_env: 0
category: 'other'
classmethod: NumericLiteralsTestCase
filename

	^'NumericLiterals.py'
%
! ------------------- Instance methods for NumericLiteralsTestCase
set compile_env: 0
category: 'other'
method: NumericLiteralsTestCase
testBinaryInteger

	self
		assert: (self statementsAt: 6) _value _n == 0;
		assert: (self statementsAt: 7) _value _n == 1;
		assert: (self statementsAt: 8) _value _n == 4;
		assert: (self statementsAt: 9) _value _n == 3;
		assert: (self statementsAt: 10) _value _n == 16;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testDecimalInteger

	| expr num |
	self
		assert: ((expr := self statementsAt: 1) isKindOf: PyExpr);
		assert: ((num := expr _value) isKindOf: PyNum);
		assert: num _n == 1;

		assert: (self statementsAt: 2) _value _n == 1234;
		assert: (self statementsAt: 3) _value _n == 12345;
		assert: (self statementsAt: 4) _value _n == 0;
		assert: (self statementsAt: 5) _value _n == 0;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testExponentFloat

	self
		assert: (self statementsAt: 30) _value _n == 2e3;
		assert: (self statementsAt: 31) _value _n == 0.11e2;
		assert: (self statementsAt: 32) _value _n == 13.2e1;
		assert: (self statementsAt: 33) _value _n == 0.129e-4;
		assert: (self statementsAt: 34) _value _n == 3.14e10;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testFloatNumber

	self
		assert: (self statementsAt: 24) _value _n == 11.0;
		assert: (self statementsAt: 25) _value _n == 3.14;
		assert: (self statementsAt: 26) _value _n == 0.11;
		assert: (self statementsAt: 27) _value _n == 13.2;
		assert: (self statementsAt: 28) _value _n == 0.129;
		assert: (self statementsAt: 29) _value _n == 22.41;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testHexadecimalInteger

	self
		assert: (self statementsAt: 16) _value _n == 1;
		assert: (self statementsAt: 17) _value _n == 2;
		assert: (self statementsAt: 18) _value _n == 257;
		assert: (self statementsAt: 19) _value _n == 10;
		assert: (self statementsAt: 20) _value _n == 169;
		assert: (self statementsAt: 21) _value _n == 33;
		assert: (self statementsAt: 22) _value _n == 144;
		assert: (self statementsAt: 23) _value _n == 251;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testImaginaryNumber

	| expr num complex |
	self
		assert: ((expr := self statementsAt: 35) isKindOf: PyExpr);
		assert: ((num := expr _value) isKindOf: PyNum);
		assert: ((complex := num _n) isKindOf: Complex);
		assert: complex real == 0;
		assert: complex imaginary == 3.14;

		assert: (self statementsAt: 36) _value _n real == 0;
		assert: (self statementsAt: 36) _value _n imaginary == 2000;
		assert: (self statementsAt: 37) _value _n real == 0;
		assert: (self statementsAt: 37) _value _n imaginary == 11;
		assert: (self statementsAt: 38) _value _n real == 0;
		assert: (self statementsAt: 38) _value _n imaginary == 132;
		assert: (self statementsAt: 39) _value _n real == 0;
		assert: (self statementsAt: 39) _value _n imaginary == 0.129;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testOctalInteger

	self
		assert: (self statementsAt: 11) _value _n == 0;
		assert: (self statementsAt: 12) _value _n == 7;
		assert: (self statementsAt: 13) _value _n == 1536;
		assert: (self statementsAt: 14) _value _n == 17;
		assert: (self statementsAt: 15) _value _n == 161;
		yourself.
%
