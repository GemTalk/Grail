! ------------------- Remove existing behavior from DelimitersTestCase
expectvalue /Metaclass3       
doit
DelimitersTestCase removeAllMethods.
DelimitersTestCase class removeAllMethods.
%
! ------------------- Class methods for DelimitersTestCase
set compile_env: 0
category: 'other'
classmethod: DelimitersTestCase
filename

	^'Delimiters.py'
%
! ------------------- Instance methods for DelimitersTestCase
set compile_env: 0
category: 'other'
method: DelimitersTestCase
testCommaList

	| x y |
	x := self statementsAt: 3.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: ListAst);
		assert: (x.ctx isKindOf: LoadAst);
		assert: (x.elts size == 3);
		assert: ((x.elts at: 1) isKindOf: ConstantAst);
		assert: (y := x.elts at: 1) notNil;
		assert: y.value.number == 1;
		assert: ((x.elts at: 2) isKindOf: ConstantAst);
		assert: (y := x.elts at: 2) notNil;
		assert: y.value.number == 2;
		assert: ((x.elts at: 3) isKindOf: ConstantAst);
		assert: (y := x.elts at: 3) notNil;
		assert: y.value.number == 3;
		yourself.
%
category: 'other'
method: DelimitersTestCase
testCommaTuple

	| x y |
	x := self statementsAt: 4.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: TupleAst);
		assert: (x.ctx isKindOf: LoadAst);
		assert: (x.elts size == 3);
		assert: ((x.elts at: 1) isKindOf: ConstantAst);
		assert: (y := x.elts at: 1) notNil;
		assert: y.value.number == 4;
		assert: ((x.elts at: 2) isKindOf: ConstantAst);
		assert: (y := x.elts at: 2) notNil;
		assert: y.value.number == 5;
		assert: ((x.elts at: 3) isKindOf: ConstantAst);
		assert: (y := x.elts at: 3) notNil;
		assert: y.value.number == 6;
		yourself.
%
category: 'other'
method: DelimitersTestCase
testParethesesLeft

	| x |
	x := self statementsAt: 1.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf:BinOpAst);
		assert: (x.op isKindOf: AddAst);
		assert: (x.left isKindOf: BinOpAst);
		assert: (x.left.left isKindOf: ConstantAst);
		assert: (x.left.left.value.number == 1);
		assert: (x.left.op isKindOf: AddAst);
		assert: (x.left.right isKindOf: ConstantAst);
		assert: (x.left.right.value.number == 2);
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value.number == 3);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testParethesesRight

	| x |
	x := self statementsAt: 2.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: BinOpAst);
		assert: (x.op isKindOf: AddAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value.number == 4);
		assert: (x.right isKindOf: BinOpAst);
		assert: (x.right.op isKindOf: AddAst);
		assert: (x.right.left isKindOf: ConstantAst);
		assert: (x.right.left.value.number == 5);
		assert: (x.right.right isKindOf: ConstantAst);
		assert: (x.right.right.value.number == 6);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceList

	| x y |
	x := self statementsAt: 5.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: SubscriptAst);
		assert: (x.ctx isKindOf: LoadAst);
		assert: (x.value isKindOf: ListAst);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: ConstantAst);
		assert: y.value.number == 1;
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value.number == 2;
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value.number == 3;
		assert: (x.slice isKindOf:SliceAst);
		assert: (x.slice.lower isKindOf: ConstantAst);
		assert: (x.slice.lower.value.number == 0);
		assert: (x.slice.upper isKindOf: ConstantAst);
		assert: (x.slice.upper.value.number == 1);
		assert: (x.slice.step isNone);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceListEmpty

	| x y |
	x := self statementsAt: 7.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf:SubscriptAst);
		assert: (x.ctx isKindOf: LoadAst);
		assert: (x.value isKindOf: ListAst);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: ConstantAst);
		assert: y.value.number == 7;
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value.number == 8;
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value.number == 9;
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower isNone);
		assert: (x.slice.upper isNone);
		assert: (x.slice.step isNone);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTuple

	| x y |
	x := self statementsAt: 6.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: SubscriptAst);
		assert: (x.ctx isKindOf: LoadAst);
		assert: (x.value isKindOf: TupleAst);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: ConstantAst);
		assert: y.value.number == 4;
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value.number == 5;
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value.number == 6;
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower isNone);
		assert: (x.slice.upper isNone);
		assert: (x.slice.step isKindOf: ConstantAst);
		assert: (x.slice.step.value.number == 2);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTupleFilled

	| x y |
	x := self statementsAt: 8.
	self 
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: SubscriptAst);
		assert: (x.ctx isKindOf: LoadAst);
		assert: (x.value isKindOf: TupleAst);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: ConstantAst);
		assert: y.value.number == 10;
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value.number == 11;
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value.number == 12;
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower isKindOf: ConstantAst);
		assert: (x.slice.lower.value.number == 1);
		assert: (x.slice.upper isKindOf: ConstantAst);
		assert: (x.slice.upper.value.number == 2);
		assert: (x.slice.step isKindOf: ConstantAst);
		assert: (x.slice.step.value.number == 3);
		yourself.
%
