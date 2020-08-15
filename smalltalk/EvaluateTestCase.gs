! ------------------- Remove existing behavior from EvaluateTestCase
expectvalue /Metaclass3       
doit
EvaluateTestCase removeAllMethods.
EvaluateTestCase class removeAllMethods.
%
! ------------------- Class methods for EvaluateTestCase
set compile_env: 0
category: 'other'
classmethod: EvaluateTestCase
filename

	^'Evaluate.py'
%
! ------------------- Instance methods for EvaluateTestCase
set compile_env: 0
category: 'other'
method: EvaluateTestCase
testAdd

	| x |
	x := self statementsAt: 1.			"1 + 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.op) isKindOf: AddAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 2);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 3);

		assert: ((x := self statementsAt: 2) isKindOf: ExprAst);			"3 + 2"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 5);

		assert: ((x := self statementsAt: 3) isKindOf: ExprAst);			"1 + 2 * 3"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 7);

		assert: ((x := self statementsAt: 4) isKindOf: ExprAst);			"-1 + 3"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 2);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testBitAnd

	| x y |
	x := self statementsAt: 9.
	self 
		assert: (x isKindOf: ExprAst);			"0b10 & 0b01"
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((y := x.value.left) isKindOf: ConstantAst);
		assert: (y.value.number == 2);
		assert: ((x.value.op) isKindOf: BitAndAst);
		assert: ((y := x.value.right) isKindOf: ConstantAst);
		assert: (y.value.number == 1);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 0);

		assert: ((x := self statementsAt: 10) isKindOf: ExprAst);			"0b101 & 0b100"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 4);

		assert: ((x := self statementsAt: 11) isKindOf: ExprAst);			"0b111 & 0b011"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 3);

		assert: ((x := self statementsAt: 12) isKindOf: ExprAst);			"0b1 & 0b1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 13) isKindOf: ExprAst);			"0b101 & 0b100 | 0b011"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 7);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testBitOr

	| x y |
	x := self statementsAt: 14.
	self 
		assert: (x isKindOf: ExprAst);			"0b10 | 0b01"
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((y := x.value.left) isKindOf: ConstantAst);
		assert: (y.value.number == 2);
		assert: ((x.value.op) isKindOf: BitOrAst);
		assert: ((y := x.value.right) isKindOf: ConstantAst);
		assert: (y.value.number == 1);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 3);

		assert: ((x := self statementsAt: 15) isKindOf: ExprAst);			"0b101 | 0b100"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 5);

		assert: ((x := self statementsAt: 16) isKindOf: ExprAst);			"0b111 | 0b011"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 7);

		assert: ((x := self statementsAt: 17) isKindOf: ExprAst);			"0b1 | 0b1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 18) isKindOf: ExprAst);			"0b101 | 0b100 & 0b011"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 5);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testBitXor

	| x y |
	x := self statementsAt: 95.
	self 
		assert: (x isKindOf: ExprAst);			"0b10 ^ 0b01"
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((y := x.value.left) isKindOf: ConstantAst);
		assert: (y.value.number == 2);
		assert: ((x.value.op) isKindOf: BitXorAst);
		assert: ((y := x.value.right) isKindOf: ConstantAst);
		assert: (y.value.number == 1);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 3);

		assert: ((x := self statementsAt: 96) isKindOf: ExprAst);			"0b101 ^ 0b100"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 97) isKindOf: ExprAst);			"0b111 ^ 0b011"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 4);

		assert: ((x := self statementsAt: 98) isKindOf: ExprAst);			"0b1 ^ 0b1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 0);

		assert: ((x := self statementsAt: 99) isKindOf: ExprAst);			"0b101 ^ 0b100 | 0b011"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 3);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testDiv

	| x |
	x := self statementsAt: 63.			"5 / 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 5);
		assert: ((x.value.op) isKindOf: DivAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 2);
		assert: ((x := x evaluate: aScope) isKindOf: float);
		assert: (x.number asFloat == 2.5);

		assert: ((x := self statementsAt: 64) isKindOf: ExprAst);			"1 / 1"
		assert: ((x := x evaluate: aScope) isKindOf: float);
		assert: (x.number asFloat == 1.0);

		assert: ((x := self statementsAt: 65) isKindOf: ExprAst);			"4 / 2"
		assert: ((x := x evaluate: aScope) isKindOf: float);
		assert: (x.number asFloat == 2.0);

		assert: ((x := self statementsAt: 66) isKindOf: ExprAst);			"2 / 8"
		assert: ((x := x evaluate: aScope) isKindOf: float);
		assert: (x.number asFloat == 0.25);
		yourself.


%
category: 'other'
method: EvaluateTestCase
testEq

	| x y |
	x := self statementsAt: 24.			"1 == 1"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: EqAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 1);
		assert: (x := x evaluate: aScope);

		assert: ((x := self statementsAt: 25) isKindOf: ExprAst);			"2 == 1"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 26) isKindOf: ExprAst);			"5 == 7"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 27) isKindOf: ExprAst);			"'Hello' == 'Hello'"
		assert: (x := x evaluate: aScope);

		assert: ((x := self statementsAt: 28) isKindOf: ExprAst);			"'World' == 'World!!!'"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 29) isKindOf: ExprAst);			"'FooBar' == 42"
		deny: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testFloorDiv

	| x |
	x := self statementsAt: 67.			"5 // 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 5);
		assert: ((x.value.op) isKindOf: FloorDivAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 2);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 2);

		assert: ((x := self statementsAt: 68) isKindOf: ExprAst);			"1 // 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 69) isKindOf: ExprAst);			"4 // 2"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 2);

		assert: ((x := self statementsAt: 70) isKindOf: ExprAst);			"2 // 8"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 0);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testGt

	| x y |
	x := self statementsAt: 19.			"1 > 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: GtAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 2);
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 20) isKindOf: ExprAst);			"3 > 2"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 21) isKindOf: ExprAst);			"2 > 2"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 22) isKindOf: ExprAst);			"5 > 4"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 23) isKindOf: ExprAst);			"4 > 3 + 1"
		deny: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testGtE

	| x y |
	x := self statementsAt: 30.			"1 >= 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: GtEAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 2);
		assert: ((x := x evaluate: aScope) == False);

		assert: ((x := self statementsAt: 31) isKindOf: ExprAst);			"3 >= 2"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 32) isKindOf: ExprAst);			"2 >= 2"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 33) isKindOf: ExprAst);			"5 >= 4"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 34) isKindOf: ExprAst);			"4 >= 3 + 2"
		deny: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testIn

	| x y |
	x := self statementsAt: 51.			"3 in [1,2,3]"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 3);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: InAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ListAst);
		assert: (y.elts isKindOf: Array);
		assert: ((y.elts at: 1) isKindOf: ConstantAst);
		assert: ((y.elts at: 2) isKindOf: ConstantAst);
		assert: ((y := y.elts at: 3) isKindOf: ConstantAst);
		assert: (y.value.number == 3);
		assert: (x := x evaluate: aScope);

		assert: ((x := self statementsAt: 52) isKindOf: ExprAst);			"4 in [1,2,3]"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 53) isKindOf: ExprAst);			"6 in [2,5,9]"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 54) isKindOf: ExprAst);			"2 in [1,2,3]"
		assert: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testIs

	| x y |
	x := self statementsAt: 79.			"1 is 1"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: IsAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 1);
		assert: (x := x evaluate: aScope);

		assert: ((x := self statementsAt: 80) isKindOf: ExprAst);			"'test' is 'test'"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 81) isKindOf: ExprAst);			"[1,2] is [1,2]"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 82) isKindOf: ExprAst);			"5 is 5"
		assert: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testIsNot

	| x y |
	x := self statementsAt: 83.			"1 is 1"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: IsNotAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 1);
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 84) isKindOf: ExprAst);			"'test' is not 'test'"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 85) isKindOf: ExprAst);			"[1,2] is not [1,2]"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 86) isKindOf: ExprAst);			"5 is not 5"
		deny: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testLShift

	| x |
	x := self statementsAt: 87.			"1 << 1"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.op) isKindOf: LShiftAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 1);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 2);

		assert: ((x := self statementsAt: 88) isKindOf: ExprAst);			"1 << 2"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 4);

		assert: ((x := self statementsAt: 89) isKindOf: ExprAst);			"2 << 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 4);

		assert: ((x := self statementsAt: 90) isKindOf: ExprAst);			"3 << 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 6);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testLt

	| x y |
	x := self statementsAt: 35.			"1 < 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: LtAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 2);
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 36) isKindOf: ExprAst);			"1 < 1"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 37) isKindOf: ExprAst);			"3 < 2"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 38) isKindOf: ExprAst);			"1 + 1 < 4 -1"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 39) isKindOf: ExprAst);			"1 < 4 < 8"
		assert: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testLtE

	| x y |
	x := self statementsAt: 40.			"1 <= 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: LtEAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 2);
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 41) isKindOf: ExprAst);			"1 <= 1"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 42) isKindOf: ExprAst);			"3 <= 2"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 43) isKindOf: ExprAst);			"1 + 1 <= 4 - 1"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 44) isKindOf: ExprAst);			"1 <= 4 <= 8"
		assert: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testMod

	| x |
	x := self statementsAt: 71.			"5 % 2"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 5);
		assert: ((x.value.op) isKindOf: ModAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 2);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 72) isKindOf: ExprAst);			"1 % 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 0);

		assert: ((x := self statementsAt: 73) isKindOf: ExprAst);			"4 % 2"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 0);

		assert: ((x := self statementsAt: 74) isKindOf: ExprAst);			"2 % 8"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 2);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testMult

	| x |
	x := self statementsAt: 59.			"1 * 3"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.op) isKindOf: MultAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 3);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 3);

		assert: ((x := self statementsAt: 60) isKindOf: ExprAst);			"1 * 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 61) isKindOf: ExprAst);			"-5 * -5"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 25);

		assert: ((x := self statementsAt: 62) isKindOf: ExprAst);			"3 * -5"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == -15);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testNotEq

	| x y |
	x := self statementsAt: 45.			"1 != 1"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: NotEqAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y.value.number == 1);
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 46) isKindOf: ExprAst);			"2 != 1"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 47) isKindOf: ExprAst);			"5 != 7"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 48) isKindOf: ExprAst);			"'hello' != 'hello'"
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 49) isKindOf: ExprAst);			"'World' != 'World!!!'"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 50) isKindOf: ExprAst);			"'FooBar' != 42"
		assert: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testNotIn

	| x y |
	x := self statementsAt: 55.			"3 not in [1,2,3]"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: CompareAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 3);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: NotInAst);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: ListAst);
		assert: (y.elts isKindOf: Array);
		assert: ((y.elts at: 1) isKindOf: ConstantAst);
		assert: ((y.elts at: 2) isKindOf: ConstantAst);
		assert: ((y := y.elts at: 3) isKindOf: ConstantAst);
		assert: (y.value.number == 3);
		deny: (x evaluate: aScope);

		assert: ((x := self statementsAt: 56) isKindOf: ExprAst);			"4 not in [1,2,3]"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 57) isKindOf: ExprAst);			"6 not in [2,5,9]"
		assert: (x evaluate: aScope);

		assert: ((x := self statementsAt: 58) isKindOf: ExprAst);			"2 not in [1,2,3]"
		deny: (x evaluate: aScope);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testPow

	| x |
	x := self statementsAt: 75.			"2**3"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 2);
		assert: ((x.value.op) isKindOf: PowAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 3);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 8);

		assert: ((x := self statementsAt: 76) isKindOf: ExprAst);			"1**5"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 77) isKindOf: ExprAst);			"3**3 + 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 28);

		assert: ((x := self statementsAt: 78) isKindOf: ExprAst);			"(-2)**2"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 4);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testRShift

	| x |
	x := self statementsAt: 91.			"1 >> 1"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf:BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 1);
		assert: ((x.value.op) isKindOf: RShiftAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 1);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 0);

		assert: ((x := self statementsAt: 92) isKindOf: ExprAst);			"2 >> 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 93) isKindOf: ExprAst);			"4 >> 2"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 1);

		assert: ((x := self statementsAt: 94) isKindOf: ExprAst);			"5 >> 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 2);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testSub

	| x |
	x := self statementsAt: 5.			"3 - 1"
	self 
		assert: (x isKindOf: ExprAst);
		assert: ((x.value) isKindOf: BinOpAst);
		assert: ((x.value.left) isKindOf: ConstantAst);
		assert: (x.value.left.value.number == 3);
		assert: ((x.value.op) isKindOf: SubAst);
		assert: ((x.value.right) isKindOf: ConstantAst);
		assert: (x.value.right.value.number == 1);
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 2);

		assert: ((x := self statementsAt: 6) isKindOf: ExprAst);			"4 - 8"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == -4);

		assert: ((x := self statementsAt: 7) isKindOf: ExprAst);			"5 - 1 * 2 + 1"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == 4);

		assert: ((x := self statementsAt: 8) isKindOf: ExprAst);			"-1 - 5"
		assert: ((x := x evaluate: aScope) isKindOf: int);
		assert: (x.number == -6);
		yourself.
%
