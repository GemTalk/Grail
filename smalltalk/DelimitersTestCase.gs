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
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyList);
		assert: (x.ctx isKindOf: PyLoad);
		assert: (x.elts size == 3);
		assert: ((x.elts at: 1) isKindOf: PyNum);
		assert: (y := x.elts at: 1) notNil;
		assert: y.n == 1;
		assert: ((x.elts at: 2) isKindOf: PyNum);
		assert: (y := x.elts at: 2) notNil;
		assert: y.n == 2;
		assert: ((x.elts at: 3) isKindOf: PyNum);
		assert: (y := x.elts at: 3) notNil;
		assert: y.n == 3;
		yourself.
%
category: 'other'
method: DelimitersTestCase
testCommaTuple

	| x y |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyTuple);
		assert: (x.ctx isKindOf: PyLoad);
		assert: (x.elts size == 3);
		assert: ((x.elts at: 1) isKindOf: PyNum);
		assert: (y := x.elts at: 1) notNil;
		assert: y.n == 4;
		assert: ((x.elts at: 2) isKindOf: PyNum);
		assert: (y := x.elts at: 2) notNil;
		assert: y.n == 5;
		assert: ((x.elts at: 3) isKindOf: PyNum);
		assert: (y := x.elts at: 3) notNil;
		assert: y.n == 6;
		yourself.
%
category: 'other'
method: DelimitersTestCase
testParethesesLeft

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x.op isKindOf: PyAdd);
		assert: (x.left isKindOf: PyBinOp);
		assert: (x.left.left isKindOf: PyNum);
		assert: (x.left.left.n == 1);
		assert: (x.left.op isKindOf: PyAdd);
		assert: (x.left.right isKindOf: PyNum);
		assert: (x.left.right.n == 2);
		assert: (x.right isKindOf: PyNum);
		assert: (x.right.n == 3);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testParethesesRight

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x.op isKindOf: PyAdd);
		assert: (x.left isKindOf: PyNum);
		assert: (x.left.n == 4);
		assert: (x.right isKindOf: PyBinOp);
		assert: (x.right.op isKindOf: PyAdd);
		assert: (x.right.left isKindOf: PyNum);
		assert: (x.right.left.n == 5);
		assert: (x.right.right isKindOf: PyNum);
		assert: (x.right.right.n == 6);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceList

	| x y |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x.ctx isKindOf: PyLoad);
		assert: (x.value isKindOf: PyList);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: PyNum);
		assert: y.n == 1;
		assert: ((y := x.value.elts at: 2) isKindOf: PyNum);
		assert: y.n == 2;
		assert: ((y := x.value.elts at: 3) isKindOf: PyNum);
		assert: y.n == 3;
		assert: (x.slice isKindOf: PySlice);
		assert: (x.slice.lower isKindOf: PyNum);
		assert: (x.slice.lower.n == 0);
		assert: (x.slice.upper isKindOf: PyNum);
		assert: (x.slice.upper.n == 1);
		assert: (x.slice.step isNil);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceListEmpty

	| x y |
	x := statements at: 7.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x.ctx isKindOf: PyLoad);
		assert: (x.value isKindOf: PyList);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: PyNum);
		assert: y.n == 7;
		assert: ((y := x.value.elts at: 2) isKindOf: PyNum);
		assert: y.n == 8;
		assert: ((y := x.value.elts at: 3) isKindOf: PyNum);
		assert: y.n == 9;
		assert: (x.slice isKindOf: PySlice);
		assert: (x.slice.lower isNil);
		assert: (x.slice.upper isNil);
		assert: (x.slice.step isNil);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTuple

	| x y |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x.ctx isKindOf: PyLoad);
		assert: (x.value isKindOf: PyTuple);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: PyNum);
		assert: y.n == 4;
		assert: ((y := x.value.elts at: 2) isKindOf: PyNum);
		assert: y.n == 5;
		assert: ((y := x.value.elts at: 3) isKindOf: PyNum);
		assert: y.n == 6;
		assert: (x.slice isKindOf: PySlice);
		assert: (x.slice.lower isNil);
		assert: (x.slice.upper isNil);
		assert: (x.slice.step isKindOf: PyNum);
		assert: (x.slice.step.n == 2);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTupleFilled

	| x y |
	x := statements at: 8.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x.value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x.ctx isKindOf: PyLoad);
		assert: (x.value isKindOf: PyTuple);
		assert: (x.value.elts size == 3);
		assert: ((y := x.value.elts at: 1) isKindOf: PyNum);
		assert: y.n == 10;
		assert: ((y := x.value.elts at: 2) isKindOf: PyNum);
		assert: y.n == 11;
		assert: ((y := x.value.elts at: 3) isKindOf: PyNum);
		assert: y.n == 12;
		assert: (x.slice isKindOf: PySlice);
		assert: (x.slice.lower isKindOf: PyNum);
		assert: (x.slice.lower.n == 1);
		assert: (x.slice.upper isKindOf: PyNum);
		assert: (x.slice.upper.n == 2);
		assert: (x.slice.step isKindOf: PyNum);
		assert: (x.slice.step.n == 3);
		yourself.
%
