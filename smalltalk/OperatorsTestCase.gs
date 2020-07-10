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
testOperatorAdd

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 1);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 2);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorEq

	| x |
	x := statements at: 9.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 10);
		assert: (x _cmpopList size == 1);
		assert: ((x _cmpopList at: 1) isKindOf: PyEq);
		assert: (x _comparatorList size == 1);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 20);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorGtE

	| x |
	x := statements at: 10.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 25);
		assert: (x _cmpopList size == 1);
		assert: ((x _cmpopList at: 1) isKindOf: PyGtE);
		assert: (x _comparatorList size == 1);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 15);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorInvert

	| x |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyInvert);
		assert: (x _operand isKindOf: PyNum);
		assert: (x _operand _n == 200);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorMod

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyMod);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 10);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 5);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedAdd

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyBinOp);
		assert: (x _left _op isKindOf: PyAdd);
		assert: (x _left _left isKindOf: PyNum);
		assert: (x _left _left _n == 2);
		assert: (x _left _right isKindOf: PyNum);
		assert: (x _left _right _n == 4);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 6);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedEq

	| x |
	x := statements at: 11.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 11);
		assert: (x _cmpopList size == 2);
		assert: ((x _cmpopList at: 1) isKindOf: PyEq);
		assert: ((x _cmpopList at: 2) isKindOf: PyEq);
		assert: (x _comparatorList size == 2);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 22);
		assert: ((x _comparatorList at: 2) _n == 33);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedGtE

	| x |
	x := statements at: 12.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyCompare);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 44);
		assert: (x _cmpopList size == 2);
		assert: ((x _cmpopList at: 1) isKindOf: PyGtE);
		assert: ((x _cmpopList at: 2) isKindOf: PyGtE);
		assert: (x _comparatorList size == 2);
		assert: ((x _comparatorList at: 1) isKindOf: PyNum);
		assert: ((x _comparatorList at: 1) _n == 55);
		assert: ((x _comparatorList at: 2) _n == 66);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorNestedMult

	| x |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyMult);
		assert: (x _left isKindOf: PyBinOp);
		assert: (x _left _op isKindOf: PyMult);
		assert: (x _left _left isKindOf: PyNum);
		assert: (x _left _left _n == 7);
		assert: (x _left _right isKindOf: PyNum);
		assert: (x _left _right _n == 8);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 9);
		yourself.
%
category: 'other'
method: OperatorsTestCase
testOperatorUSub

	| x |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyUSub);
		assert: (x _operand isKindOf: PyNum);
		assert: (x _operand _n == 100);
		yourself.
%
