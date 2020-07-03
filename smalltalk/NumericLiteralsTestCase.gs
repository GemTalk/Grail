! ------------------- Remove existing behavior from NumericLiteralsTestCase
expectvalue /Metaclass3       
doit
NumericLiteralsTestCase removeAllMethods.
NumericLiteralsTestCase class removeAllMethods.
%
! ------------------- Class methods for NumericLiteralsTestCase
! ------------------- Instance methods for NumericLiteralsTestCase
set compile_env: 0
category: 'other'
method: NumericLiteralsTestCase
filename

	^'NumericLiterals.py'
%
category: 'other'
method: NumericLiteralsTestCase
testBinaryInteger

	self
		assert: (statements at: 6) _value _n == 0;
		assert: (statements at: 7) _value _n == 1;
		assert: (statements at: 8) _value _n == 4;
		assert: (statements at: 9) _value _n == 3;
		assert: (statements at: 10) _value _n == 16;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testDecimalInteger

	| expr num |
	self
		assert: ((expr := statements at: 1) isKindOf: PyExpr);
		assert: ((num := expr _value) isKindOf: PyNum);
		assert: num _n == 1;

		assert: (statements at: 2) _value _n == 1234;
		assert: (statements at: 3) _value _n == 12345;
		assert: (statements at: 4) _value _n == 0;
		assert: (statements at: 5) _value _n == 0;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testExponentFloat

	self
		assert: (statements at: 30) _value _n == 2e3;
		assert: (statements at: 31) _value _n == 0.11e2;
		assert: (statements at: 32) _value _n == 13.2e1;
		assert: (statements at: 33) _value _n == 0.129e-4;
		assert: (statements at: 34) _value _n == 3.14e10;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testFloatNumber

	self
		assert: (statements at: 24) _value _n == 11.0;
		assert: (statements at: 25) _value _n == 3.14;
		assert: (statements at: 26) _value _n == 0.11;
		assert: (statements at: 27) _value _n == 13.2;
		assert: (statements at: 28) _value _n == 0.129;
		assert: (statements at: 29) _value _n == 22.41;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testHexadecimalInteger

	self
		assert: (statements at: 16) _value _n == 1;
		assert: (statements at: 17) _value _n == 2;
		assert: (statements at: 18) _value _n == 257;
		assert: (statements at: 19) _value _n == 10;
		assert: (statements at: 20) _value _n == 169;
		assert: (statements at: 21) _value _n == 33;
		assert: (statements at: 22) _value _n == 144;
		assert: (statements at: 23) _value _n == 251;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testImaginaryNumber

	| expr num complex |
	self
		assert: ((expr := statements at: 35) isKindOf: PyExpr);
		assert: ((num := expr _value) isKindOf: PyNum);
		assert: ((complex := num _n) isKindOf: Complex);
		assert: complex real == 0;
		assert: complex imaginary == 3.14;

		assert: (statements at: 36) _value _n real == 0;
		assert: (statements at: 36) _value _n imaginary == 2000;
		assert: (statements at: 37) _value _n real == 0;
		assert: (statements at: 37) _value _n imaginary == 11;
		assert: (statements at: 38) _value _n real == 0;
		assert: (statements at: 38) _value _n imaginary == 132;
		assert: (statements at: 39) _value _n real == 0;
		assert: (statements at: 39) _value _n imaginary == 0.129;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testOctalInteger

	self
		assert: (statements at: 11) _value _n == 0;
		assert: (statements at: 12) _value _n == 7;
		assert: (statements at: 13) _value _n == 1536;
		assert: (statements at: 14) _value _n == 17;
		assert: (statements at: 15) _value _n == 161;
		yourself.
%
