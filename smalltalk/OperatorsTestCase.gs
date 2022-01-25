! ------------------- Remove existing behavior from OperatorsTestCase
removeAllMethods OperatorsTestCase
removeAllClassMethods OperatorsTestCase
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
		assert: (x.left.value = 'int with: 1');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int with: 2');
		yourself.
%
category: 'other'
method: OperatorsTestCase
testEq

	| x |
	x := self statementsAt: 18.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int with: 10');
		assert: (x.cmpopList size == 1);
		assert: ((x.cmpopList at: 1) isKindOf: EqAst);
		assert: (x.comparatorList size == 1);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (x := x.comparatorList at: 1) notNil;
		assert: x.value = 'int with: 20';
		yourself.
%
category: 'other'
method: OperatorsTestCase
testGtE

	| x |
	x := self statementsAt: 19.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int with: 25');
		assert: (x.cmpopList size == 1);
		assert: ((x.cmpopList at: 1) isKindOf: GtEAst);
		assert: (x.comparatorList size == 1);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (x := x.comparatorList at: 1) notNil;
		assert: x.value = 'int with: 15';
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
		assert: (x.operand.value = 'int with: 200');
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
		assert: (x.left.value = 'int with: 10');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int with: 5');
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
		assert: (x.left.left.value = 'int with: 2');
		assert: (x.left.right isKindOf: ConstantAst);
		assert: (x.left.right.value = 'int with: 4');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int with: 6');
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedEq

	| x y |
	x := self statementsAt: 20.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int with: 11');
		assert: (x.cmpopList size == 2);
		assert: ((x.cmpopList at: 1) isKindOf: EqAst);
		assert: ((x.cmpopList at: 2) isKindOf: EqAst);
		assert: (x.comparatorList size == 2);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y := x.comparatorList at: 1) notNil;
		assert: y.value = 'int with: 22';
		assert: (y := x.comparatorList at: 2) notNil;
		assert: y.value = 'int with: 33';
		yourself.
%
category: 'other'
method: OperatorsTestCase
testNestedGtE

	| x y |
	x := self statementsAt: 21.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: CompareAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int with: 44');
		assert: (x.cmpopList size == 2);
		assert: ((x.cmpopList at: 1) isKindOf: GtEAst);
		assert: ((x.cmpopList at: 2) isKindOf: GtEAst);
		assert: (x.comparatorList size == 2);
		assert: ((x.comparatorList at: 1) isKindOf: ConstantAst);
		assert: (y := x.comparatorList at: 1) notNil;
		assert: y.value = 'int with: 55';
		assert: (y := x.comparatorList at: 2) notNil;
		assert: y.value = 'int with: 66';
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
		assert: (x.left.left.value = 'int with: 7');
		assert: (x.left.right isKindOf: ConstantAst);
		assert: (x.left.right.value = 'int with: 8');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int with: 9');
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
		assert: (x.operand.value = 'int with: 100');
		yourself.
%
