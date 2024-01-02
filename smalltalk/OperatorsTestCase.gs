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
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BinOpAst);
		assert: (x.op isKindOf: AddAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int ___value: 1');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int ___value: 2');
		yourself.
%
category: 'other'
method: OperatorsTestCase
testEq

	| x |
	x := self statementsAt: 20.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int ___value: 10');
		assert: (x.cmpopList size == 1);
		assert: ((x.cmpopList at: 1) isKindOf: EqAst);
		assert: (x.comparatorList size == 1);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (x := x.comparatorList at: 1) notNil;
		assert: x.value = 'int ___value: 20';
		yourself.
%
category: 'other'
method: OperatorsTestCase
testGtE

	| x |
	x := self statementsAt: 21.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int ___value: 25');
		assert: (x.cmpopList size == 1);
		assert: ((x.cmpopList at: 1) isKindOf: GtEAst);
		assert: (x.comparatorList size == 1);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (x := x.comparatorList at: 1) notNil;
		assert: x.value = 'int ___value: 15';
		yourself.
%
category: 'other'
method: OperatorsTestCase
testInvert

	| x |
	x := self statementsAt: 15.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: InvertAst);
		assert: (x.operand isKindOf: ConstantAst);
		assert: (x.operand.value = 'int ___value: 200');
		yourself.
%
category: 'other'
method: OperatorsTestCase
testMod

	| x |
	x := self statementsAt: 7.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf:BinOpAst);
		assert: (x.op isKindOf: ModAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int ___value: 10');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int ___value: 5');
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedAdd

	| x |
	x := self statementsAt: 12.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BinOpAst);
		assert: (x.op isKindOf: AddAst);
		assert: (x.left isKindOf: BinOpAst);
		assert: (x.left.op isKindOf: AddAst);
		assert: (x.left.left isKindOf: ConstantAst);
		assert: (x.left.left.value = 'int ___value: 2');
		assert: (x.left.right isKindOf: ConstantAst);
		assert: (x.left.right.value = 'int ___value: 4');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int ___value: 6');
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedEq

	| x y |
	x := self statementsAt: 30.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int ___value: 11');
		assert: (x.cmpopList size == 3);
		assert: ((x.cmpopList at: 1) isKindOf: EqAst);
		assert: ((x.cmpopList at: 2) isKindOf: EqAst);
		assert: (x.comparatorList size == 3);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y := x.comparatorList at: 1) notNil;
		assert: y.value = 'int ___value: 22';
		assert: (y := x.comparatorList at: 2) notNil;
		assert: y.value = 'int ___value: 33';
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedGtE

	| x y |
	x := self statementsAt: 31.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int ___value: 44');
		assert: (x.cmpopList size == 2);
		assert: ((x.cmpopList at: 1) isKindOf: GtEAst);
		assert: ((x.cmpopList at: 2) isKindOf: GtEAst);
		assert: (x.comparatorList size == 2);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y := x.comparatorList at: 1) notNil;
		assert: y.value = 'int ___value: 55';
		assert: (y := x.comparatorList at: 2) notNil;
		assert: y.value = 'int ___value: 66';
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedMult

	| x |
	x := self statementsAt: 13.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BinOpAst);
		assert: (x.op isKindOf: MultAst);
		assert: (x.left isKindOf: BinOpAst);
		assert: (x.left.op isKindOf: MultAst);
		assert: (x.left.left isKindOf: ConstantAst);
		assert: (x.left.left.value = 'int ___value: 7');
		assert: (x.left.right isKindOf: ConstantAst);
		assert: (x.left.right.value = 'int ___value: 8');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int ___value: 9');
		yourself.
%
category: 'other'
method: OperatorsTestCase
testUSub

	| x |
	x := self statementsAt: 14.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: USubAst);
		assert: (x.operand isKindOf: ConstantAst);
		assert: (x.operand.value = 'int ___value: 100');
		yourself.
%
