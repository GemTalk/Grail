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
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.op) isKindOf: PyAdd);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 2);
		assert: (x evaluate == 3);

		assert: ((x := self statementsAt: 2) isKindOf: PyExpr);			"3 + 2"
		assert: (x evaluate == 5);

		assert: ((x := self statementsAt: 3) isKindOf: PyExpr);			"1 + 2 * 3"
		assert: (x evaluate == 7);

		assert: ((x := self statementsAt: 4) isKindOf: PyExpr);			"-1 + 3"
		assert: (x evaluate == 2);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testBitAnd

	| x y |
	x := self statementsAt: 9.
	self 
		assert: (x isKindOf: PyExpr);			"0b10 & 0b01"
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((y := x.value.left) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: ((x.value.op) isKindOf: PyBitAnd);
		assert: ((y := x.value.right) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x evaluate == 0);

		assert: ((x := self statementsAt: 10) isKindOf: PyExpr);			"0b101 & 0b100"
		assert: (x evaluate == 4);

		assert: ((x := self statementsAt: 11) isKindOf: PyExpr);			"0b111 & 0b011"
		assert: (x evaluate == 3);

		assert: ((x := self statementsAt: 12) isKindOf: PyExpr);			"0b1 & 0b1"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 13) isKindOf: PyExpr);			"0b101 & 0b100 | 0b011"
		assert: (x evaluate == 7);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testBitOr

	| x y |
	x := self statementsAt: 14.
	self 
		assert: (x isKindOf: PyExpr);			"0b10 | 0b01"
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((y := x.value.left) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: ((x.value.op) isKindOf: PyBitOr);
		assert: ((y := x.value.right) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x evaluate == 3);

		assert: ((x := self statementsAt: 15) isKindOf: PyExpr);			"0b101 | 0b100"
		assert: (x evaluate == 5);

		assert: ((x := self statementsAt: 16) isKindOf: PyExpr);			"0b111 | 0b011"
		assert: (x evaluate == 7);

		assert: ((x := self statementsAt: 17) isKindOf: PyExpr);			"0b1 | 0b1"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 18) isKindOf: PyExpr);			"0b101 | 0b100 & 0b011"
		assert: (x evaluate == 5);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testBitXor

	| x y |
	x := self statementsAt: 95.
	self 
		assert: (x isKindOf: PyExpr);			"0b10 ^ 0b01"
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((y := x.value.left) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: ((x.value.op) isKindOf: PyBitXor);
		assert: ((y := x.value.right) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x evaluate == 3);

		assert: ((x := self statementsAt: 96) isKindOf: PyExpr);			"0b101 ^ 0b100"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 97) isKindOf: PyExpr);			"0b111 ^ 0b011"
		assert: (x evaluate == 4);

		assert: ((x := self statementsAt: 98) isKindOf: PyExpr);			"0b1 ^ 0b1"
		assert: (x evaluate == 0);

		assert: ((x := self statementsAt: 99) isKindOf: PyExpr);			"0b101 ^ 0b100 | 0b011"
		assert: (x evaluate == 3);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testDiv

	| x |
	x := self statementsAt: 63.			"5 / 2"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 5);
		assert: ((x.value.op) isKindOf: PyDiv);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 2);
		assert: (x evaluate == 2.5);

		assert: ((x := self statementsAt: 64) isKindOf: PyExpr);			"1 / 1"
		assert: (x evaluate == 1.0);

		assert: ((x := self statementsAt: 65) isKindOf: PyExpr);			"4 / 2"
		assert: (x evaluate == 2.0);

		assert: ((x := self statementsAt: 66) isKindOf: PyExpr);			"2 / 8"
		assert: (x evaluate == 0.25);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testEq

	| x y |
	x := self statementsAt: 24.			"1 == 1"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyEq);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 25) isKindOf: PyExpr);			"2 == 1"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 26) isKindOf: PyExpr);			"5 == 7"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 27) isKindOf: PyExpr);			"'Hello' == 'Hello'"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 28) isKindOf: PyExpr);			"'World' == 'World!!!'"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 29) isKindOf: PyExpr);			"'FooBar' == 42"
		assert: (x evaluate == false);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testFloorDiv

	| x |
	x := self statementsAt: 67.			"5 // 2"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 5);
		assert: ((x.value.op) isKindOf: PyFloorDiv);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 2);
		assert: (x evaluate == 2);

		assert: ((x := self statementsAt: 68) isKindOf: PyExpr);			"1 // 1"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 69) isKindOf: PyExpr);			"4 // 2"
		assert: (x evaluate == 2);

		assert: ((x := self statementsAt: 70) isKindOf: PyExpr);			"2 // 8"
		assert: (x evaluate == 0);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testGt

	| x y |
	x := self statementsAt: 19.			"1 > 2"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyGt);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 20) isKindOf: PyExpr);			"3 > 2"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 21) isKindOf: PyExpr);			"2 > 2"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 22) isKindOf: PyExpr);			"5 > 4"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 23) isKindOf: PyExpr);			"4 > 3 + 1"
		assert: (x evaluate == false);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testGtE

	| x y |
	x := self statementsAt: 30.			"1 >= 2"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyGtE);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 31) isKindOf: PyExpr);			"3 >= 2"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 32) isKindOf: PyExpr);			"2 >= 2"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 33) isKindOf: PyExpr);			"5 >= 4"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 34) isKindOf: PyExpr);			"4 >= 3 + 2"
		assert: (x evaluate == false);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testIn

	| x y |
	x := self statementsAt: 51.			"3 in [1,2,3]"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 3);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyIn);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyList);
		assert: (y.elts isKindOf: Array);
		assert: ((y.elts at: 1) isKindOf: PyNum);
		assert: ((y.elts at: 2) isKindOf: PyNum);
		assert: ((y := y.elts at: 3) isKindOf: PyNum);
		assert: (y.n == 3);
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 52) isKindOf: PyExpr);			"4 in [1,2,3]"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 53) isKindOf: PyExpr);			"6 in [2,5,9]"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 54) isKindOf: PyExpr);			"2 in [1,2,3]"
		assert: (x evaluate == true);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testIs

	| x y |
	x := self statementsAt: 79.			"1 is 1"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyIs);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 80) isKindOf: PyExpr);			"'test' is 'test'" "SHOULD BE TRUE"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 81) isKindOf: PyExpr);			"[1,2] is [1,2]"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 82) isKindOf: PyExpr);			"5 is 5"
		assert: (x evaluate == true);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testIsNot

	| x y |
	x := self statementsAt: 83.			"1 is 1"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyIsNot);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 84) isKindOf: PyExpr);			"'test' is not 'test'" "SHOULD BE FALSE"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 85) isKindOf: PyExpr);			"[1,2] is not [1,2]"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 86) isKindOf: PyExpr);			"5 is not 5"
		assert: (x evaluate == false);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testLShift

	| x |
	x := self statementsAt: 87.			"1 << 1"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.op) isKindOf: PyLShift);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 1);
		assert: (x evaluate == 2);

		assert: ((x := self statementsAt: 88) isKindOf: PyExpr);			"1 << 2"
		assert: (x evaluate == 4);

		assert: ((x := self statementsAt: 89) isKindOf: PyExpr);			"2 << 1"
		assert: (x evaluate == 4);

		assert: ((x := self statementsAt: 90) isKindOf: PyExpr);			"3 << 1"
		assert: (x evaluate == 6);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testLt

	| x y |
	x := self statementsAt: 35.			"1 < 2"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyLt);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 36) isKindOf: PyExpr);			"1 < 1"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 37) isKindOf: PyExpr);			"3 < 2"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 38) isKindOf: PyExpr);			"1 + 1 < 4 -1"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 39) isKindOf: PyExpr);			"1 < 4 < 8"
		assert: (x evaluate == true);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testLtE

	| x y |
	x := self statementsAt: 40.			"1 <= 2"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyLtE);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 41) isKindOf: PyExpr);			"1 <= 1"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 42) isKindOf: PyExpr);			"3 <= 2"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 43) isKindOf: PyExpr);			"1 + 1 <= 4 - 1"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 44) isKindOf: PyExpr);			"1 <= 4 <= 8"
		assert: (x evaluate == true);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testMod

	| x |
	x := self statementsAt: 71.			"5 % 2"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 5);
		assert: ((x.value.op) isKindOf: PyMod);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 2);
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 72) isKindOf: PyExpr);			"1 % 1"
		assert: (x evaluate == 0);

		assert: ((x := self statementsAt: 73) isKindOf: PyExpr);			"4 % 2"
		assert: (x evaluate == 0);

		assert: ((x := self statementsAt: 74) isKindOf: PyExpr);			"2 % 8"
		assert: (x evaluate == 2);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testMult

	| x |
	x := self statementsAt: 59.			"1 * 3"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.op) isKindOf: PyMult);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 3);
		assert: (x evaluate == 3);

		assert: ((x := self statementsAt: 60) isKindOf: PyExpr);			"1 * 1"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 61) isKindOf: PyExpr);			"-5 * -5"
		assert: (x evaluate == 25);

		assert: ((x := self statementsAt: 62) isKindOf: PyExpr);			"3 * -5"
		assert: (x evaluate == -15);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testNotEq

	| x y |
	x := self statementsAt: 45.			"1 != 1"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyNotEq);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 46) isKindOf: PyExpr);			"2 != 1"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 47) isKindOf: PyExpr);			"5 != 7"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 48) isKindOf: PyExpr);			"'hello' != 'hello'"
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 49) isKindOf: PyExpr);			"'World' != 'World!!!'"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 50) isKindOf: PyExpr);			"'FooBar' != 42"
		assert: (x evaluate == true);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testNotIn

	| x y |
	x := self statementsAt: 55.			"3 not in [1,2,3]"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyCompare);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 3);
		assert: ((x.value.cmpopList) isKindOf: Array);
		assert: ((x.value.cmpopList at: 1) isKindOf: PyNotIn);
		assert: ((x.value.comparatorList) isKindOf: Array);
		assert: ((y := x.value.comparatorList at: 1) isKindOf: PyList);
		assert: (y.elts isKindOf: Array);
		assert: ((y.elts at: 1) isKindOf: PyNum);
		assert: ((y.elts at: 2) isKindOf: PyNum);
		assert: ((y := y.elts at: 3) isKindOf: PyNum);
		assert: (y.n == 3);
		assert: (x evaluate == false);

		assert: ((x := self statementsAt: 56) isKindOf: PyExpr);			"4 not in [1,2,3]"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 57) isKindOf: PyExpr);			"6 not in [2,5,9]"
		assert: (x evaluate == true);

		assert: ((x := self statementsAt: 58) isKindOf: PyExpr);			"2 not in [1,2,3]"
		assert: (x evaluate == false);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testPow

	| x |
	x := self statementsAt: 75.			"2**3"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 2);
		assert: ((x.value.op) isKindOf: PyPow);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 3);
		assert: (x evaluate == 8);

		assert: ((x := self statementsAt: 76) isKindOf: PyExpr);			"1**5"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 77) isKindOf: PyExpr);			"3**3 + 1"
		assert: (x evaluate == 28);

		assert: ((x := self statementsAt: 78) isKindOf: PyExpr);			"(-2)**2"
		assert: (x evaluate == 4);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testRShift

	| x |
	x := self statementsAt: 91.			"1 >> 1"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 1);
		assert: ((x.value.op) isKindOf: PyRShift);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 1);
		assert: (x evaluate == 0);

		assert: ((x := self statementsAt: 92) isKindOf: PyExpr);			"2 >> 1"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 93) isKindOf: PyExpr);			"4 >> 2"
		assert: (x evaluate == 1);

		assert: ((x := self statementsAt: 94) isKindOf: PyExpr);			"5 >> 1"
		assert: (x evaluate == 2);
		yourself.
%
category: 'other'
method: EvaluateTestCase
testSub

	| x |
	x := self statementsAt: 5.			"3 - 1"
	self 
		assert: (x isKindOf: PyExpr);
		assert: ((x.value) isKindOf: PyBinOp);
		assert: ((x.value.left) isKindOf: PyNum);
		assert: (x.value.left.n == 3);
		assert: ((x.value.op) isKindOf: PySub);
		assert: ((x.value.right) isKindOf: PyNum);
		assert: (x.value.right.n == 1);
		assert: (x evaluate == 2);

		assert: ((x := self statementsAt: 6) isKindOf: PyExpr);			"4 - 8"
		assert: (x evaluate == -4);

		assert: ((x := self statementsAt: 7) isKindOf: PyExpr);			"5 - 1 * 2 + 1"
		assert: (x evaluate == 4);

		assert: ((x := self statementsAt: 8) isKindOf: PyExpr);			"-1 - 5"
		assert: (x evaluate == -6);
		yourself.
%
