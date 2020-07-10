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

	| x |
	self
		assert: (x := statements at: 6) notNil;
		assert: (x := x.value) notNil;
		assert: x.n == 0;

		assert: (x := statements at: 7) notNil;
		assert: x.value.n == 1;

		assert: (x := statements at: 8) notNil;
		assert: x.value.n == 4;

		assert: (x := statements at: 9) notNil;
		assert: x.value.n == 3;

		assert: (x := statements at: 10) notNil;
		assert: x.value.n == 16;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testDecimalInteger

	| expr num |
	self
		assert: ((expr := statements at: 1) isKindOf: PyExpr);
		assert: ((num := expr.value) isKindOf: PyNum);
		assert: num.n == 1;

		assert: (expr := statements at: 2) notNil;
		assert: expr.value.n == 1234;

		assert: (expr := statements at: 3) notNil;
		assert: expr.value.n == 12345;

		assert: (expr := statements at: 4) notNil;
		assert: expr.value.n == 0;

		assert: (expr := statements at: 5) notNil;
		assert: expr.value.n == 0;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testExponentFloat

	| x |
	self
		assert: (x := statements at: 30) notNil;
		assert: x.value.n == 2e3;

		assert: (x := statements at: 31) notNil;
		assert: x.value.n == 0.11e2;

		assert: (x := statements at: 32) notNil;
		assert: x.value.n == 13.2e1;

		assert: (x := statements at: 33) notNil;
		assert: x.value.n == 0.129e-4;

		assert: (x := statements at: 34) notNil;
		assert: x.value.n == 3.14e10;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testFloatNumber

	| x |
	self
		assert: (x := statements at: 24) notNil;
		assert: x.value.n == 11.0;

		assert: (x := statements at: 25) notNil;
		assert: x.value.n == 3.14;

		assert: (x := statements at: 26) notNil;
		assert: x.value.n == 0.11;

		assert: (x := statements at: 27) notNil;
		assert: x.value.n == 13.2;

		assert: (x := statements at: 28) notNil;
		assert: x.value.n == 0.129;

		assert: (x := statements at: 29) notNil;
		assert: x.value.n == 22.41;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testHexadecimalInteger

	| x |
	self
		assert: (x := statements at: 16) notNil;
		assert: x.value.n == 1;

		assert: (x := statements at: 17) notNil;
		assert: x.value.n == 2;

		assert: (x := statements at: 18) notNil;
		assert: x.value.n == 257;

		assert: (x := statements at: 19) notNil;
		assert: x.value.n == 10;

		assert: (x := statements at: 20) notNil;
		assert: x.value.n == 169;

		assert: (x := statements at: 21) notNil;
		assert: x.value.n == 33;

		assert: (x := statements at: 22) notNil;
		assert: x.value.n == 144;

		assert: (x := statements at: 23) notNil;
		assert: x.value.n == 251;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testImaginaryNumber

	| expr num complex |
	self
		assert: ((expr := statements at: 35) isKindOf: PyExpr);
		assert: ((num := expr.value) isKindOf: PyNum);
		assert: ((complex := num.n) isKindOf: Complex);
		assert: complex.real == 0;
		assert: complex.imaginary == 3.14;

		assert: (expr := statements at: 36) notNil;
		assert: expr.value.n.real == 0;
		assert: expr.value.n.imaginary == 2000;

		assert: (expr := statements at: 37) notNil;
		assert: expr.value.n.real == 0;
		assert: expr.value.n.imaginary == 11;

		assert: (expr := statements at: 38) notNil;
		assert: expr.value.n.real == 0;
		assert: expr.value.n.imaginary == 132;

		assert: (expr := statements at: 39) notNil;
		assert: expr.value.n.real == 0;
		assert: expr.value.n.imaginary == 0.129;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testOctalInteger

	| x |
	self
		assert: (x := statements at: 11) notNil;
		assert: x.value.n == 0;

		assert: (x := statements at: 12) notNil;
		assert: x.value.n == 7;

		assert: (x := statements at: 13)  notNil;
		assert: x.value.n == 1536;

		assert: (x := statements at: 14)  notNil;
		assert: x.value.n == 17;

		assert: (x := statements at: 15)  notNil;
		assert: x.value.n == 161;
		yourself.
%
