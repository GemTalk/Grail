! ------------------- Remove existing behavior from NumericLiteralsTestCase
removeallmethods NumericLiteralsTestCase
removeallclassmethods NumericLiteralsTestCase
! ------------------- Class methods for NumericLiteralsTestCase
! ------------------- Instance methods for NumericLiteralsTestCase
category: 'other'
method: NumericLiteralsTestCase
testBinaryInteger

	| x pyString ast |
	pyString := '0b0
0b_1
0b_100
0B_11
0B_1_0000'.
	ast := ModuleAst astForSource: pyString.
	self
		assert: (x := ast.body.body at: 1) notNil;
		assert: (x := x.value) notNil;
		assert: x.value = 'int ___value: 0';

		assert: (x := ast.body.body at: 2) notNil;
		assert: x.value.value = 'int ___value: 1';

		assert: (x := ast.body.body at: 3) notNil;
		assert: x.value.value = 'int ___value: 4';

		assert: (x := ast.body.body at: 4) notNil;
		assert: x.value.value = 'int ___value: 3';

		assert: (x := ast.body.body at: 5) notNil;
		assert: x.value.value = 'int ___value: 16';

		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testDecimalInteger

	| expr num pyString ast |
	pyString := '1
1234
12_345
0
0_000'.
	ast := ModuleAst astForSource: pyString.
	self
		assert: ((expr := ast.body.body at: 1) isKindOf: ExprAst);
		assert: ((num := expr.value) isKindOf: ConstantAst);
		assert: ((num := num.value) isKindOf: String);
		assert: num = 'int ___value: 1';

		assert: (expr := ast.body.body at: 2) notNil;
		assert: expr.value.value = 'int ___value: 1234';

		assert: (expr := ast.body.body at: 3) notNil;
		assert: expr.value.value = 'int ___value: 12345';

		assert: (expr := ast.body.body at: 4) notNil;
		assert: expr.value.value = 'int ___value: 0';

		assert: (expr := ast.body.body at: 5) notNil;
		assert: expr.value.value = 'int ___value: 0';
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testExponentFloat

	| x pyString ast |
	pyString := '2e3
.11e2
1_3.2e+1
.12_9E-4
3.14E10'.
	ast := ModuleAst astForSource: pyString.
	self
		assert: (x := ast.body.body at: 1) notNil;
		assert: x.value.value = 'float ___value: 2000.0';

		assert: (x := ast.body.body at: 2) notNil;
		assert: x.value.value = 'float ___value: 11.0';

		assert: (x := ast.body.body at: 3) notNil;
		assert: x.value.value = 'float ___value: 132.0';

		assert: (x := ast.body.body at: 4) notNil;
		assert: x.value.value = 'float ___value: 1.29e-05';

		assert: (x := ast.body.body at: 5) notNil;
		assert: x.value.value = 'float ___value: 31400000000.0';
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testFloatNumber

	| x pyString ast |
	pyString := '11.
3.14
.11
1_3.2
.12_9
2_2.4_1'.
	ast := ModuleAst astForSource: pyString.
	self
		assert: (x := ast.body.body at: 1) notNil;
		assert: x.value.value =  'float ___value: 11.0';

		assert: (x := ast.body.body at: 2) notNil;
		assert: x.value.value = 'float ___value: 3.14';

		assert: (x := ast.body.body at: 3) notNil;
		assert: x.value.value = 'float ___value: 0.11';

		assert: (x := ast.body.body at: 4) notNil;
		assert: x.value.value = 'float ___value: 13.2';

		assert: (x := ast.body.body at: 5) notNil;
		assert: x.value.value = 'float ___value: 0.129';

		assert: (x := ast.body.body at: 6) notNil;
		assert: x.value.value = 'float ___value: 22.41';
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testHexadecimalInteger

	| x pyString ast |
	pyString := '0x1
0x_2
0x_101
0xa
0xA9
0X_21
0X9_0
0XF_b'.
	ast := ModuleAst astForSource: pyString.
	self
		assert: (x := ast.body.body at: 1) notNil;
		assert: x.value.value = 'int ___value: 1';

		assert: (x := ast.body.body at: 2) notNil;
		assert: x.value.value = 'int ___value: 2';

		assert: (x := ast.body.body at: 3) notNil;
		assert: x.value.value = 'int ___value: 257';

		assert: (x := ast.body.body at: 4) notNil;
		assert: x.value.value = 'int ___value: 10';

		assert: (x := ast.body.body at: 5) notNil;
		assert: x.value.value = 'int ___value: 169';

		assert: (x := ast.body.body at: 6) notNil;
		assert: x.value.value = 'int ___value: 33';

		assert: (x := ast.body.body at: 7) notNil;
		assert: x.value.value = 'int ___value: 144';

		assert: (x := ast.body.body at: 8) notNil;
		assert: x.value.value = 'int ___value: 251';
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testImaginaryNumber

	| expr num complexNumber pyString ast |
	pyString := '3.14J
2e3J
.11e2J
1_3.2e+1j
.12_9j'.
	ast := ModuleAst astForSource: pyString.
	self
		assert: ((expr := ast.body.body at: 1) isKindOf: ExprAst);
		assert: ((num := expr.value) isKindOf: ConstantAst);
		assert: ((complexNumber := num.value) isKindOf: String);
		assert: complexNumber = 'complex ___real: 0 imaginary: 3.14';

		assert: (expr := ast.body.body at: 2) notNil;
		assert: expr.value.value = 'complex ___real: 0 imaginary: 2000';

		assert: (expr := ast.body.body at: 3) notNil;
		assert: expr.value.value = 'complex ___real: 0 imaginary: 11';

		assert: (expr := ast.body.body at: 4) notNil;
		assert: expr.value.value = 'complex ___real: 0 imaginary: 132';

		assert: (expr := ast.body.body at: 5) notNil;
		assert: expr.value.value = 'complex ___real: 0 imaginary: 0.129';
		yourself.
%
category: 'other'
method: NumericLiteralsTestCase
testOctalInteger

	| x pyString ast |
	pyString := '0o0
0o_7
0o3_000
0O_21
0O241'.
	ast := ModuleAst astForSource: pyString.
	self
		assert: (x := ast.body.body at: 1) notNil;
		assert: x.value.value = 'int ___value: 0';

		assert: (x := ast.body.body at: 2) notNil;
		assert: x.value.value = 'int ___value: 7';

		assert: (x := ast.body.body at: 3)  notNil;
		assert: x.value.value = 'int ___value: 1536';

		assert: (x := ast.body.body at: 4)  notNil;
		assert: x.value.value = 'int ___value: 17';

		assert: (x := ast.body.body at: 5)  notNil;
		assert: x.value.value = 'int ___value: 161';
		yourself.
%
