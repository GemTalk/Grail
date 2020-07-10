! ------------------- Remove existing behavior from SimpleStatementsTestCase
expectvalue /Metaclass3       
doit
SimpleStatementsTestCase removeAllMethods.
SimpleStatementsTestCase class removeAllMethods.
%
! ------------------- Class methods for SimpleStatementsTestCase
set compile_env: 0
category: 'other'
classmethod: SimpleStatementsTestCase
filename

	^'SimpleStatements.py'
%
! ------------------- Instance methods for SimpleStatementsTestCase
set compile_env: 0
category: 'other'
method: SimpleStatementsTestCase
testArrayAssignment

	| x y |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: (y.id = 'x');
		assert: (y.ctx isKindOf: PyStore);
		assert: (x.value isKindOf: PyList);
		assert: (x.value.elts size == 2);
		assert: ((y := x.value.elts at: 1) isKindOf: PyNum);
		assert: (y.n == 0);
		assert: ((y := x.value.elts at: 2) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: (x.value.ctx isKindOf: PyLoad);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssertFalse

	| x |
	x := statements at: 10.
	self 
		assert: (x isKindOf: PyAssert);
		assert: (x.test isKindOf: PyNameConstant);
		deny: x.test.value;
		assert: x.msg isNil;
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssertTrue

	| x |
	x := statements at: 9.
	self 
		assert: (x isKindOf: PyAssert);
		assert: (x.test isKindOf: PyNameConstant);
		assert: (x.test.value);
		assert: (x.msg isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignMultiple

	| x y |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x.value isKindOf: PyNum);
		assert: (x.value.n == 2);
		assert: (x.targets size == 2);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: (y.id = 'var2');
		assert: (y.ctx isKindOf: PyStore);
		assert: ((y := x.targets at: 2) isKindOf: PyName);
		assert: (y.id = 'var3');
		assert: (y.ctx isKindOf: PyStore);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignSingle

	| x y |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x.value isKindOf: PyNum);
		assert: (x.value.n == 1);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: (y.id = 'var1');
		assert: (y.ctx isKindOf: PyStore);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testBreak

	| x |
	x := statements at: 21.
	self 
		assert: (x isKindOf: PyFor);
		assert: (x.target isKindOf: PyName);
		assert: (x.target.id = '_');
		assert: (x.target.ctx isKindOf: PyStore);
		assert: (x.iter isKindOf: PyName);
		assert: (x.iter.id = 'x');
		assert: (x.iter.ctx isKindOf: PyLoad);
		assert: (x.body size = 1);
		assert: ((x.body at: 1) isKindOf: PyBreak);
		assert: (x.orelse size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassAttributeAssignment

	| x y |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyAttribute);
		assert: (y.value isKindOf: PyName);
		assert: y.value.id = 'inst';
		assert: (y.value.ctx isKindOf: PyLoad);
		assert: (y.attr = 'x');
		assert: (y.ctx isKindOf: PyStore);
		assert: (x.value isKindOf: PyBinOp);
		assert: (x.value.left isKindOf: PyAttribute);
		assert: (x.value.left.value isKindOf: PyName);
		assert: (x.value.left.value.id = 'inst');
		assert: (x.value.left.value.ctx isKindOf: PyLoad);
		assert: (x.value.left.attr = 'x');
		assert: (x.value.left.ctx isKindOf: PyLoad);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassDefCls

	| x y |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'Cls');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body size == 1);
		assert: ((y := x.body at: 1) isKindOf: PyAssign);
		assert: (y.targets size == 1);
		assert: ((y := y.targets at: 1) isKindOf: PyName);
		assert: (y.id = 'x');
		assert: (y.ctx isKindOf: PyStore);
		assert: (y := x.body at: 1) notNil;
		assert: (y.value isKindOf: PyNum);
		assert: (y.value.n == 3);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassInstantiation

	| x y |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: (y.id = 'inst');
		assert: (y.ctx isKindOf: PyStore);
		assert: (x.value isKindOf: PyCall);
		assert: (x.value.function isKindOf: PyName);
		assert: (x.value.function.id = 'Cls');
		assert: (x.value.function.ctx isKindOf: PyLoad);
		assert: (x.value.arguments size == 0);
		assert: (x.value.keywords size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testContinue

	| x |
	x := statements at: 22.
	self 
		assert: (x isKindOf: PyFor);
		assert: (x.target isKindOf: PyName);
		assert: (x.target.id = '_');
		assert: (x.target.ctx isKindOf: PyStore);
		assert: (x.iter isKindOf: PyName);
		assert: (x.iter.id = 'x');
		assert: (x.iter.ctx isKindOf: PyLoad);
		assert: (x.body size = 1);
		assert: ((x.body at: 1) isKindOf: PyContinue);
		assert: (x.orelse size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelMultiple

	| x y |
	x := statements at: 14.
	self 
		assert: (x isKindOf: PyDelete);
		assert: (x.targets size == 2);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: y.id = 'x';
		assert: (y.ctx isKindOf: PyDel);
		assert: ((y := x.targets at: 2) isKindOf: PyName);
		assert: y.id = 'i';
		assert: (y.ctx isKindOf: PyDel);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelSingle

	| x y |
	x := statements at: 13.
	self 
		assert: (x isKindOf: PyDelete);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: y.id = 'x';
		assert: (y.ctx isKindOf: PyDel);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testGlobal

	| x |
	x := statements at: 25.
	self 
		assert: (x isKindOf: PyGlobal);
		assert: (x.names size == 1);
		assert: ((x.names at: 1) = 'g');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testImport

	| x y |
	x := statements at: 23.
	self 
		assert: (x isKindOf: PyImport);
		assert: (x.names size == 1);
		assert: ((y := x.names at: 1) isKindOf: PyAlias);
		assert: (y.name = 'foo');
		assert: (y.asName isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testImportFrom

	| x y |
	x := statements at: 24.
	self 
		assert: (x isKindOf: PyImportFrom);
		assert: (x.module = 'foo');
		assert: (x.names size == 1);
		assert: ((y := x.names at: 1) isKindOf: PyAlias);
		assert: (y.name = 'attr');
		assert: (y.asName isNil);
		assert: (x.level = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testIndexAssignment

	| x y |
	x := statements at: 7.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: (y.id = 'i');
		assert: (y.ctx isKindOf: PyStore);
		assert: (x.value isKindOf: PyNum);
		assert: (x.value.n == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testNonlocal

	| x |
	x := statements at: 26.
	self 
		assert: (x isKindOf: PyNonlocal);
		assert: (x.names size == 1);
		assert: ((x.names at: 1) = 'x');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testPassClass

	| x |
	x := statements at: 12.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'C');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testPassFunction

	| x y |
	x := statements at: 11.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'f');
		assert: (x.args isKindOf: PyArguments);
		assert: ((y := x.args.args at: 1) isKindOf: PyArg);
		assert: (y.arg = 'arg');
		assert: (y.annotation isNil);
		assert: (x.args.vararg isNil);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNil);
		assert: (x.args.defaults size == 0);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaise

	| x y |
	x := statements at: 19.
	self 
		assert: (x isKindOf: PyRaise);
		assert: (x.exc isKindOf: PyCall);
		assert: (x.exc.function isKindOf: PyName);
		assert: (x.exc.function.id = 'RuntimeError');
		assert: (x.exc.function.ctx isKindOf: PyLoad);
		assert: (x.exc.arguments size == 1);
		assert: ((y := x.exc.arguments at: 1) isKindOf: PyStr);
		assert: (y.s = 'Something bad happened');
		assert: (x.exc.keywords size == 0);
		assert: (x.exc.function isKindOf: PyName);
		assert: (x.cause isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaiseFromNone

	| x y |
	x := statements at: 20.
	self 
		assert: (x isKindOf: PyRaise);
		assert: (x.exc isKindOf: PyCall);
		assert: (x.exc.function isKindOf: PyName);
		assert: (x.exc.function.id = 'RuntimeError');
		assert: (x.exc.function.ctx isKindOf: PyLoad);
		assert: (x.exc.arguments size == 1);
		assert: ((y := x.exc.arguments at: 1) isKindOf: PyStr);
		assert: (y.s = 'Something bad happened');
		assert: (x.exc.keywords size == 0);
		assert: (x.exc.function isKindOf: PyName);
		assert: (x.cause isKindOf: PyNameConstant);
		assert: (x.cause.value isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnNone

	| x y |
	x := statements at: 15.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'a');
		assert: (x.args isKindOf: PyArguments);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNil);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNil);
		assert: (x.args.defaults size == 0);
		assert: (x.body size == 1);
		assert: ((y := x.body at: 1) isKindOf: PyReturn);
		assert: (y.value isNil);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnTrue

	| x y |
	x := statements at: 16.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'b');
		assert: (x.args isKindOf: PyArguments);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNil);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNil);
		assert: (x.args.defaults size == 0);
		assert: (x.body size == 1);
		assert: ((y := x.body at: 1) isKindOf: PyReturn);
		assert: (y.value isKindOf: PyNameConstant);
		assert: (y.value.value);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testSwapAssignment

	| x y |
	x := statements at: 8.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyTuple);
		assert: ((y := y.elts at: 1) isKindOf: PyName);
		assert: (y.id = 'i');
		assert: (y.ctx isKindOf: PyStore);
		assert: (y := x.targets at: 1) notNil;
		assert: ((y := y.elts at: 2) isKindOf: PySubscript);
		assert: (y.value isKindOf: PyName);
		assert: (y.value.id = 'x');
		assert: (y.value.ctx isKindOf: PyLoad);
		assert: (y.ctx isKindOf: PyStore);
		assert: (y := x.targets at: 1) notNil;
		assert: (y.ctx isKindOf: PyStore);
		assert: (x.value isKindOf: PyTuple);
		assert: (x.value.elts size == 2);
		assert: ((y := x.value.elts at: 1) isKindOf: PyNum);
		assert: (y.n == 1);
		assert: ((y := x.value.elts at: 2) isKindOf: PyNum);
		assert: (y.n == 2);
		assert: (x.value.ctx isKindOf: PyLoad);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYield

	| x y |
	x := statements at: 17.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'gen');
		assert: (x.args isKindOf: PyArguments);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNil);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNil);
		assert: (x.args.defaults size == 0);
		assert: (x.body size == 1);
		assert: ((y := x.body at: 1) isKindOf: PyExpr);
		assert: (y.value isKindOf: PyYield);
		assert: (y.value.value isKindOf: PyNum);
		assert: (y.value.value.n == 123);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYieldAsync

	| x y |
	x := statements at: 18.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x.name = 'agen');
		assert: (x.args isKindOf: PyArguments);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNil);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNil);
		assert: (x.args.defaults size == 0);
		assert: (x.body size == 1);
		assert: ((y := x.body at: 1) isKindOf: PyExpr);
		assert: (y.value isKindOf: PyYield);
		assert: (y.value.value isKindOf: PyNum);
		assert: (y.value.value.n == 123);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
