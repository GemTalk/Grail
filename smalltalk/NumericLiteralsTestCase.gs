! ------------------- Remove existing behavior from NumericLiteralsTestCase
removeAllMethods NumericLiteralsTestCase
removeAllClassMethods NumericLiteralsTestCase
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
		assert: (x := self statementsAt: 6) notNil;
		assert: (x := x.value) notNil;
		assert: x.value.number == 0;

		assert: (x := self statementsAt: 7) notNil;
		assert: x.value.value.number == 1;

		assert: (x := self statementsAt: 8) notNil;
		assert: x.value.value.number == 4;

		assert: (x := self statementsAt: 9) notNil;
		assert: x.value.value.number == 3;

		assert: (x := self statementsAt: 10) notNil;
		assert: x.value.value.number == 16;

		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testDecimalInteger

	| expr num |
	self
		assert: ((expr := self statementsAt: 1) isKindOf: ExprAst);
		assert: ((num := expr.value) isKindOf: ConstantAst);
		assert: ((num := num.value) isKindOf: int);
		assert: num.number == 1;

		assert: (expr := self statementsAt: 2) notNil;
		assert: expr.value.value.number == 1234;

		assert: (expr := self statementsAt: 3) notNil;
		assert: expr.value.value.number == 12345;

		assert: (expr := self statementsAt: 4) notNil;
		assert: expr.value.value.number == 0;

		assert: (expr := self statementsAt: 5) notNil;
		assert: expr.value.value.number == 0;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testExponentFloat

	| x |
	self
		assert: (x := self statementsAt: 30) notNil;
		assert: x.value.value.number == 2e3;

		assert: (x := self statementsAt: 31) notNil;
		assert: x.value.value.number == 0.11e2;

		assert: (x := self statementsAt: 32) notNil;
		assert: x.value.value.number == 13.2e1;

		assert: (x := self statementsAt: 33) notNil;
		assert: x.value.value.number == 0.129e-4;

		assert: (x := self statementsAt: 34) notNil;
		assert: x.value.value.number == 3.14e10;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testFloatNumber

	| x |
	self
		assert: (x := self statementsAt: 24) notNil;
		assert: x.value.value.number == 11.0;

		assert: (x := self statementsAt: 25) notNil;
		assert: x.value.value.number == 3.14;

		assert: (x := self statementsAt: 26) notNil;
		assert: x.value.value.number == 0.11;

		assert: (x := self statementsAt: 27) notNil;
		assert: x.value.value.number == 13.2;

		assert: (x := self statementsAt: 28) notNil;
		assert: x.value.value.number == 0.129;

		assert: (x := self statementsAt: 29) notNil;
		assert: x.value.value.number == 22.41;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testHexadecimalInteger

	| x |
	self
		assert: (x := self statementsAt: 16) notNil;
		assert: x.value.value.number == 1;

		assert: (x := self statementsAt: 17) notNil;
		assert: x.value.value.number == 2;

		assert: (x := self statementsAt: 18) notNil;
		assert: x.value.value.number == 257;

		assert: (x := self statementsAt: 19) notNil;
		assert: x.value.value.number == 10;

		assert: (x := self statementsAt: 20) notNil;
		assert: x.value.value.number == 169;

		assert: (x := self statementsAt: 21) notNil;
		assert: x.value.value.number == 33;

		assert: (x := self statementsAt: 22) notNil;
		assert: x.value.value.number == 144;

		assert: (x := self statementsAt: 23) notNil;
		assert: x.value.value.number == 251;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testImaginaryNumber

	| expr num complexNumber |
	self
		assert: ((expr := self statementsAt: 35) isKindOf: ExprAst);
		assert: ((num := expr.value) isKindOf: ConstantAst);
		assert: ((complexNumber := num.value) isKindOf: complex);
		assert: complexNumber.number == 0;
		assert: complexNumber.imaginary == 3.14;

		assert: (expr := self statementsAt: 36) notNil;
		assert: expr.value.value.number == 0;
		assert: expr.value.value.imaginary == 2000;

		assert: (expr := self statementsAt: 37) notNil;
		assert: expr.value.value.number == 0;
		assert: expr.value.value.imaginary == 11;

		assert: (expr := self statementsAt: 38) notNil;
		assert: expr.value.value.number == 0;
		assert: expr.value.value.imaginary == 132;

		assert: (expr := self statementsAt: 39) notNil;
		assert: expr.value.value.number == 0;
		assert: expr.value.value.imaginary == 0.129;
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testOctalInteger

	| x |
	self
		assert: (x := self statementsAt: 11) notNil;
		assert: x.value.value.number == 0;

		assert: (x := self statementsAt: 12) notNil;
		assert: x.value.value.number == 7;

		assert: (x := self statementsAt: 13)  notNil;
		assert: x.value.value.number == 1536;

		assert: (x := self statementsAt: 14)  notNil;
		assert: x.value.value.number == 17;

		assert: (x := self statementsAt: 15)  notNil;
		assert: x.value.value.number == 161;
		yourself.
%
