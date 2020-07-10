! ------------------- Remove existing behavior from OperatorsTestCase
expectvalue /Metaclass3       
doit
OperatorsTestCase removeAllMethods.
OperatorsTestCase class removeAllMethods.
%
! ------------------- Class methods for OperatorsTestCase
set compile_env: 0
category: 'other'
classmethod: OperatorsTestCase
filename

	^'Operators.py'
%
! ------------------- Instance methods for OperatorsTestCase
set compile_env: 0
category: 'other'
method: OperatorsTestCase
testAdd

	| x |
	x := self statementsAt: 1.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x.op isKindOf: PyAdd);
		assert: (x.left isKindOf: PyNum);
		assert: (x.left.n == 1);
		assert: (x.right isKindOf: PyNum);
		assert: (x.right.n == 2);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testEq

	| x |
	x := self statementsAt: 9.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x.left isKindOf: PyNum);
		assert: (x.left.n == 10);
		assert: (x.cmpopList size == 1);
		assert: ((x.cmpopList at: 1) isKindOf: PyEq);
		assert: (x.comparatorList size == 1);
		assert: ((x.comparatorList at: 1) isKindOf: PyNum);
		assert: (x := x.comparatorList at: 1) notNil;
		assert: x.n == 20;
		yourself.
%
category: 'other'
method: OperatorsTestCase
testGtE

	| x |
	x := self statementsAt: 10.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x.left isKindOf: PyNum);
		assert: (x.left.n == 25);
		assert: (x.cmpopList size == 1);
		assert: ((x.cmpopList at: 1) isKindOf: PyGtE);
		assert: (x.comparatorList size == 1);
		assert: ((x.comparatorList at: 1) isKindOf: PyNum);
		assert: (x := x.comparatorList at: 1) notNil;
		assert: x.n == 15;
		yourself.
%
category: 'other'
method: OperatorsTestCase
testInvert

	| x |
	x := self statementsAt: 6.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyInvert);
		assert: (x.operand isKindOf: PyNum);
		assert: (x.operand.n == 200);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testMod

	| x |
	x := self statementsAt: 2.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x.op isKindOf: PyMod);
		assert: (x.left isKindOf: PyNum);
		assert: (x.left.n == 10);
		assert: (x.right isKindOf: PyNum);
		assert: (x.right.n == 5);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedAdd

	| x |
	x := self statementsAt: 3.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x.op isKindOf: PyAdd);
		assert: (x.left isKindOf: PyBinOp);
		assert: (x.left.op isKindOf: PyAdd);
		assert: (x.left.left isKindOf: PyNum);
		assert: (x.left.left.n == 2);
		assert: (x.left.right isKindOf: PyNum);
		assert: (x.left.right.n == 4);
		assert: (x.right isKindOf: PyNum);
		assert: (x.right.n == 6);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedEq

	| x y |
	x := self statementsAt: 11.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x.left isKindOf: PyNum);
		assert: (x.left.n == 11);
		assert: (x.cmpopList size == 2);
		assert: ((x.cmpopList at: 1) isKindOf: PyEq);
		assert: ((x.cmpopList at: 2) isKindOf: PyEq);
		assert: (x.comparatorList size == 2);
		assert: ((x.comparatorList at: 1) isKindOf: PyNum);
		assert: (y := x.comparatorList at: 1) notNil;
		assert: y.n == 22;
		assert: (y := x.comparatorList at: 2) notNil;
		assert: y.n == 33;
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedGtE

	| x y |
	x := self statementsAt: 12.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x.left isKindOf: PyNum);
		assert: (x.left.n == 44);
		assert: (x.cmpopList size == 2);
		assert: ((x.cmpopList at: 1) isKindOf: PyGtE);
		assert: ((x.cmpopList at: 2) isKindOf: PyGtE);
		assert: (x.comparatorList size == 2);
		assert: ((x.comparatorList at: 1) isKindOf: PyNum);
		assert: (y := x _comparatorList at: 1) notNil;
		assert: y.n == 55;
		assert: (y := x _comparatorList at: 2) notNil;
		assert: y.n == 66;
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedMult

	| x |
	x := self statementsAt: 4.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x.op isKindOf: PyMult);
		assert: (x.left isKindOf: PyBinOp);
		assert: (x.left.op isKindOf: PyMult);
		assert: (x.left.left isKindOf: PyNum);
		assert: (x.left.left.n == 7);
		assert: (x.left.right isKindOf: PyNum);
		assert: (x.left.right.n == 8);
		assert: (x.right isKindOf: PyNum);
		assert: (x.right.n == 9);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testUSub

	| x |
	x := self statementsAt: 5.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyUSub);
		assert: (x.operand isKindOf: PyNum);
		assert: (x.operand.n == 100);
		yourself.
%
