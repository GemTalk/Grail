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

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyList);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _elts size == 3);
		assert: ((x _elts at: 1) isKindOf: PyNum);
		assert: ((x _elts at: 1) _n == 1);
		assert: ((x _elts at: 2) isKindOf: PyNum);
		assert: ((x _elts at: 2) _n == 2);
		assert: ((x _elts at: 3) isKindOf: PyNum);
		assert: ((x _elts at: 3) _n == 3);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testCommaTuple

	| x |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PyTuple);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _elts size == 3);
		assert: ((x _elts at: 1) isKindOf: PyNum);
		assert: ((x _elts at: 1) _n == 4);
		assert: ((x _elts at: 2) isKindOf: PyNum);
		assert: ((x _elts at: 2) _n == 5);
		assert: ((x _elts at: 3) isKindOf: PyNum);
		assert: ((x _elts at: 3) _n == 6);
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
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyBinOp);
		assert: (x _left _left isKindOf: PyNum);
		assert: (x _left _left _n == 1);
		assert: (x _left _op isKindOf: PyAdd);
		assert: (x _left _right isKindOf: PyNum);
		assert: (x _left _right _n == 2);
		assert: (x _right isKindOf: PyNum);
		assert: (x _right _n == 3);
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
	x := x _value.
	self 
		assert: (x isKindOf: PyBinOp);
		assert: (x _op isKindOf: PyAdd);
		assert: (x _left isKindOf: PyNum);
		assert: (x _left _n == 4);
		assert: (x _right isKindOf: PyBinOp);
		assert: (x _right _op isKindOf: PyAdd);
		assert: (x _right _left isKindOf: PyNum);
		assert: (x _right _left _n == 5);
		assert: (x _right _right isKindOf: PyNum);
		assert: (x _right _right _n == 6);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceList

	| x |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyList);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 1);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 2);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 3);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isKindOf: PyNum);
		assert: (x _slice _lower _n == 0);
		assert: (x _slice _upper isKindOf: PyNum);
		assert: (x _slice _upper _n == 1);
		assert: (x _slice _step isNil);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceListEmpty

	| x |
	x := statements at: 7.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyList);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 7);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 8);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 9);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isNil);
		assert: (x _slice _upper isNil);
		assert: (x _slice _step isNil);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTuple

	| x |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyTuple);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 4);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 5);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 6);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isNil);
		assert: (x _slice _upper isNil);
		assert: (x _slice _step isKindOf: PyNum);
		assert: (x _slice _step _n == 2);
		yourself.
%
category: 'other'
method: DelimitersTestCase
testSliceTupleFilled

	| x |
	x := statements at: 8.
	self 
		assert: (x isKindOf: PyExpr);
		yourself.
	x := x _value.
	self 
		assert: (x isKindOf: PySubscript);
		assert: (x _ctx isKindOf: PyLoad);
		assert: (x _value isKindOf: PyTuple);
		assert: (x _value _elts size == 3);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 10);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 11);
		assert: ((x _value _elts at: 3) isKindOf: PyNum);
		assert: ((x _value _elts at: 3) _n == 12);
		assert: (x _slice isKindOf: PySlice);
		assert: (x _slice _lower isKindOf: PyNum);
		assert: (x _slice _lower _n == 1);
		assert: (x _slice _upper isKindOf: PyNum);
		assert: (x _slice _upper _n == 2);
		assert: (x _slice _step isKindOf: PyNum);
		assert: (x _slice _step _n == 3);
		yourself.
%
