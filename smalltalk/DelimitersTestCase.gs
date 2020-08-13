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
		assert: ((x.elts at: 1) isKindOf: NumAst);
		assert: (y := x.elts at: 1) notNil;
		assert: y.n.number == 1;
		assert: ((x.elts at: 2) isKindOf: NumAst);
		assert: (y := x.elts at: 2) notNil;
		assert: y.n.number == 2;
		assert: ((x.elts at: 3) isKindOf: NumAst);
		assert: (y := x.elts at: 3) notNil;
		assert: y.n.number == 3;
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
		assert: ((x.elts at: 1) isKindOf: NumAst);
		assert: (y := x.elts at: 1) notNil;
		assert: y.n.number == 4;
		assert: ((x.elts at: 2) isKindOf: NumAst);
		assert: (y := x.elts at: 2) notNil;
		assert: y.n.number == 5;
		assert: ((x.elts at: 3) isKindOf: NumAst);
		assert: (y := x.elts at: 3) notNil;
		assert: y.n.number == 6;
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
		assert: (x.left.left isKindOf: NumAst);
		assert: (x.left.left.n.number == 1);
		assert: (x.left.op isKindOf: AddAst);
		assert: (x.left.right isKindOf: NumAst);
		assert: (x.left.right.n.number == 2);
		assert: (x.right isKindOf: NumAst);
		assert: (x.right.n.number == 3);
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
		assert: (x.left isKindOf: NumAst);
		assert: (x.left.n.number == 4);
		assert: (x.right isKindOf: BinOpAst);
		assert: (x.right.op isKindOf: AddAst);
		assert: (x.right.left isKindOf: NumAst);
		assert: (x.right.left.n.number == 5);
		assert: (x.right.right isKindOf: NumAst);
		assert: (x.right.right.n.number == 6);
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
		assert: ((y := x.value.elts at: 1) isKindOf: NumAst);
		assert: y.n.number == 1;
		assert: ((y := x.value.elts at: 2) isKindOf: NumAst);
		assert: y.n.number == 2;
		assert: ((y := x.value.elts at: 3) isKindOf: NumAst);
		assert: y.n.number == 3;
		assert: (x.slice isKindOf:SliceAst);
		assert: (x.slice.lower isKindOf: NumAst);
		assert: (x.slice.lower.n.number == 0);
		assert: (x.slice.upper isKindOf: NumAst);
		assert: (x.slice.upper.n.number == 1);
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
		assert: ((y := x.value.elts at: 1) isKindOf: NumAst);
		assert: y.n.number == 7;
		assert: ((y := x.value.elts at: 2) isKindOf: NumAst);
		assert: y.n.number == 8;
		assert: ((y := x.value.elts at: 3) isKindOf: NumAst);
		assert: y.n.number == 9;
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
		assert: ((y := x.value.elts at: 1) isKindOf: NumAst);
		assert: y.n.number == 4;
		assert: ((y := x.value.elts at: 2) isKindOf: NumAst);
		assert: y.n.number == 5;
		assert: ((y := x.value.elts at: 3) isKindOf: NumAst);
		assert: y.n.number == 6;
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower isNone);
		assert: (x.slice.upper isNone);
		assert: (x.slice.step isKindOf: NumAst);
		assert: (x.slice.step.n.number == 2);
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
		assert: ((y := x.value.elts at: 1) isKindOf: NumAst);
		assert: y.n.number == 10;
		assert: ((y := x.value.elts at: 2) isKindOf: NumAst);
		assert: y.n.number == 11;
		assert: ((y := x.value.elts at: 3) isKindOf: NumAst);
		assert: y.n.number == 12;
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower isKindOf: NumAst);
		assert: (x.slice.lower.n.number == 1);
		assert: (x.slice.upper isKindOf: NumAst);
		assert: (x.slice.upper.n.number == 2);
		assert: (x.slice.step isKindOf: NumAst);
		assert: (x.slice.step.n.number == 3);
		yourself.
%
