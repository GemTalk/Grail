! ------------------- Remove existing behavior from DelimitersTestCase
removeallmethods DelimitersTestCase
removeallclassmethods DelimitersTestCase
! ------------------- Class methods for DelimitersTestCase
! ------------------- Instance methods for DelimitersTestCase
category: 'other'
method: DelimitersTestCase
testCommaList

	| pyString ast x y |
	pyString := '[1, 2, 3]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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
		assert: y.value = 'int ___value: 1';
		assert: ((x.elts at: 2) isKindOf: ConstantAst);
		assert: (y := x.elts at: 2) notNil;
		assert: y.value = 'int ___value: 2';
		assert: ((x.elts at: 3) isKindOf: ConstantAst);
		assert: (y := x.elts at: 3) notNil;
		assert: y.value = 'int ___value: 3';
		yourself.
%
category: 'other'
method: DelimitersTestCase
testCommaTuple

	| pyString ast x y |
	pyString := '(4, 5, 6)'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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
		assert: y.value = 'int ___value: 4';
		assert: ((x.elts at: 2) isKindOf: ConstantAst);
		assert: (y := x.elts at: 2) notNil;
		assert: y.value = 'int ___value: 5';
		assert: ((x.elts at: 3) isKindOf: ConstantAst);
		assert: (y := x.elts at: 3) notNil;
		assert: y.value = 'int ___value: 6';
		yourself.
%
category: 'other'
method: DelimitersTestCase
testParethesesLeft

	| pyString ast x |
	pyString := '(1 + 2) + 3'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf:BinOpAst);
		assert: (x.op isKindOf: AddAst);
		assert: (x.left isKindOf: BinOpAst);
		assert: (x.left.left isKindOf: ConstantAst);
		assert: (x.left.left.value = 'int ___value: 1');
		assert: (x.left.op isKindOf: AddAst);
		assert: (x.left.right isKindOf: ConstantAst);
		assert: (x.left.right.value = 'int ___value: 2');
		assert: (x.right isKindOf: ConstantAst);
		assert: (x.right.value = 'int ___value: 3');
		yourself.
%
category: 'other'
method: DelimitersTestCase
testParethesesRight

	| pyString ast x |
	pyString := '4 + (5 + 6)'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ExprAst);
		yourself.
	x := x.value.
	self
		assert: (x isKindOf: BinOpAst);
		assert: (x.op isKindOf: AddAst);
		assert: (x.left isKindOf: ConstantAst);
		assert: (x.left.value = 'int ___value: 4');
		assert: (x.right isKindOf: BinOpAst);
		assert: (x.right.op isKindOf: AddAst);
		assert: (x.right.left isKindOf: ConstantAst);
		assert: (x.right.left.value = 'int ___value: 5');
		assert: (x.right.right isKindOf: ConstantAst);
		assert: (x.right.right.value = 'int ___value: 6');
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceList

	| pyString ast x y |
	pyString := '[1, 2, 3][0:1]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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
		assert: y.value = 'int ___value: 1';
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 2';
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 3';
		assert: (x.slice isKindOf:SliceAst);
		assert: (x.slice.lower isKindOf: ConstantAst);
		assert: (x.slice.lower.value = 'int ___value: 0');
		assert: (x.slice.upper isKindOf: ConstantAst);
		assert: (x.slice.upper.value = 'int ___value: 1');
		assert: (x.slice.step == None);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceListEmpty

	| pyString ast x y |
	pyString := '[7, 8, 9][::]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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
		assert: y.value = 'int ___value: 7';
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 8';
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 9';
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower == None);
		assert: (x.slice.upper == None);
		assert: (x.slice.step == None);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTuple

	| pyString ast x y |
	pyString := '(4, 5, 6)[::2]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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
		assert: y.value = 'int ___value: 4';
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 5';
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 6';
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower == None);
		assert: (x.slice.upper == None);
		assert: (x.slice.step isKindOf: ConstantAst);
		assert: (x.slice.step.value = 'int ___value: 2');
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTupleFilled

	| pyString ast x y |
	pyString := '(10, 11, 12)[1:2:3]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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
		assert: y.value = 'int ___value: 10';
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 11';
		assert: ((y := x.value.elts at: 3) isKindOf: ConstantAst);
		assert: y.value = 'int ___value: 12';
		assert: (x.slice isKindOf: SliceAst);
		assert: (x.slice.lower isKindOf: ConstantAst);
		assert: (x.slice.lower.value = 'int ___value: 1');
		assert: (x.slice.upper isKindOf: ConstantAst);
		assert: (x.slice.upper.value = 'int ___value: 2');
		assert: (x.slice.step isKindOf: ConstantAst);
		assert: (x.slice.step.value = 'int ___value: 3');
		yourself.
%
