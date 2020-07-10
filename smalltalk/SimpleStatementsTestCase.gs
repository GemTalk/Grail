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

	| x |
	x := self statementsAt: 6.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x _targets size == 1);
		assert: ((x _targets at: 1) isKindOf: PyName);
		assert: ((x _targets at: 1) _id = 'x');
		assert: ((x _targets at: 1) _ctx isKindOf: PyStore);
		assert: (x _value isKindOf: PyList);
		assert: (x _value _elts size == 2);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 0);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 1);
		assert: (x _value _ctx isKindOf: PyLoad);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssertFalse

	| x |
	x := self statementsAt: 10.
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
	x := self statementsAt: 9.
	self 
		assert: (x isKindOf: PyAssert);
		assert: (x _test isKindOf: PyNameConstant);
		assert: (x _test _value);
		assert: (x _msg isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignMultiple

	| x |
	x := self statementsAt: 2.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x _value isKindOf: PyNum);
		assert: (x _value _n == 2);
		assert: (x _targets size == 2);
		assert: ((x _targets at: 1) isKindOf: PyName);
		assert: ((x _targets at: 1) _id = 'var2');
		assert: ((x _targets at: 1) _ctx isKindOf: PyStore);
		assert: ((x _targets at: 2) isKindOf: PyName);
		assert: ((x _targets at: 2) _id = 'var3');
		assert: ((x _targets at: 2) _ctx isKindOf: PyStore);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignSingle

	| x |
	x := self statementsAt: 1.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x _value isKindOf: PyNum);
		assert: (x _value _n == 1);
		assert: (x _targets size == 1);
		assert: ((x _targets at: 1) isKindOf: PyName);
		assert: ((x _targets at: 1) _id = 'var1');
		assert: ((x _targets at: 1) _ctx isKindOf: PyStore);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testBreak

	| x |
	x := self statementsAt: 21.
	self 
		assert: (x isKindOf: PyFor);
		assert: (x.target isKindOf: PyName);
		assert: (x.target.id = '_');
		assert: (x.target.ctx isKindOf: PyStore);
		assert: (x.iter isKindOf: PyName);
		assert: (x.iter.id = 'x');
		assert: (x.iter.ctx isKindOf: PyLoad);
		assert: (x.body.body size = 1);
		assert: ((x.body.body at: 1) isKindOf: PyBreak);
		assert: (x.orelse.body size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassAttributeAssignment

	| x |
	x := self statementsAt: 5.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x _targets size == 1);
		assert: ((x _targets at: 1) isKindOf: PyAttribute);
		assert: ((x _targets at: 1) _value isKindOf: PyName);
		assert: ((x _targets at: 1) _value _id = 'inst');
		assert: ((x _targets at: 1) _value _ctx isKindOf: PyLoad);
		assert: ((x _targets at: 1) _attr = 'x');
		assert: ((x _targets at: 1) _ctx isKindOf: PyStore);
		assert: (x _value isKindOf: PyBinOp);
		assert: (x _value _left isKindOf: PyAttribute);
		assert: (x _value _left _value isKindOf: PyName);
		assert: (x _value _left _value _id = 'inst');
		assert: (x _value _left _value _ctx isKindOf: PyLoad);
		assert: (x _value _left _attr = 'x');
		assert: (x _value _left _ctx isKindOf: PyLoad);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassDefCls

	| x y z |
	x := self statementsAt: 3.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'Cls');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: PyAssign);
		assert: (y.targets size == 1);
		assert: ((z := y.targets at: 1) isKindOf: PyName);
		assert: (z.id = 'x');
		assert: (z.ctx isKindOf: PyStore);
		assert: (y.value isKindOf: PyNum);
		assert: (y.value.n == 3);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassInstantiation

	| x |
	x := self statementsAt: 4.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x _targets size == 1);
		assert: ((x _targets at: 1) isKindOf: PyName);
		assert: ((x _targets at: 1) _id = 'inst');
		assert: ((x _targets at: 1) _ctx isKindOf: PyStore);
		assert: (x _value isKindOf: PyCall);
		assert: (x _value _function isKindOf: PyName);
		assert: (x _value _function _id = 'Cls');
		assert: (x _value _function _ctx isKindOf: PyLoad);
		assert: (x _value _arguments size == 0);
		assert: (x _value _keywords size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testContinue

	| x |
	x := self statementsAt: 22.
	self 
		assert: (x isKindOf: PyFor);
		assert: (x.target isKindOf: PyName);
		assert: (x.target.id = '_');
		assert: (x.target.ctx isKindOf: PyStore);
		assert: (x.iter isKindOf: PyName);
		assert: (x.iter.id = 'x');
		assert: (x.iter.ctx isKindOf: PyLoad);
		assert: (x.body.body size = 1);
		assert: ((x.body.body at: 1) isKindOf: PyContinue);
		assert: (x.orelse size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelMultiple

	| x |
	x := self statementsAt: 14.
	self 
		assert: (x isKindOf: PyDelete);
		assert: (x _targets size == 2);
		assert: ((x _targets at: 1) isKindOf: PyName);
		assert: ((x _targets at: 1) _id = 'x');
		assert: ((x _targets at: 1) _ctx isKindOf: PyDel);
		assert: ((x _targets at: 2) isKindOf: PyName);
		assert: ((x _targets at: 2) _id = 'i');
		assert: ((x _targets at: 2) _ctx isKindOf: PyDel);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelSingle

	| x y |
	x := self statementsAt: 13.
	self 
		assert: (x isKindOf: PyDelete);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: PyName);
		assert: (y.id = 'x');
		assert: (y.ctx isKindOf: PyDel);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testGlobal

	| x |
	x := self statementsAt: 25.
	self 
		assert: (x isKindOf: PyGlobal);
		assert: (x.names size == 1);
		assert: ((x.names at: 1) = 'g');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testImport

	| x |
	x := self statementsAt: 23.
	self 
		assert: (x isKindOf: PyImport);
		assert: (x.names size == 1);
		assert: ((x.names at: 1) isKindOf: PyAlias);
		assert: ((x.names at: 1) _name = 'foo');
		assert: ((x.names at: 1) _asName isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testImportFrom

	| x |
	x := self statementsAt: 24.
	self 
		assert: (x isKindOf: PyImportFrom);
		assert: (x _module = 'foo');
		assert: (x.names size == 1);
		assert: ((x.names at: 1) isKindOf: PyAlias);
		assert: ((x.names at: 1) _name = 'attr');
		assert: ((x.names at: 1) _asName isNil);
		assert: (x _level = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testIndexAssignment

	| x |
	x := self statementsAt: 7.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x _targets size == 1);
		assert: ((x _targets at: 1) isKindOf: PyName);
		assert: ((x _targets at: 1) _id = 'i');
		assert: ((x _targets at: 1) _ctx isKindOf: PyStore);
		assert: (x _value isKindOf: PyNum);
		assert: (x _value _n == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testNonlocal

	| x |
	x := self statementsAt: 26.
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
	x := self statementsAt: 12.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'C');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testPassFunction

	| x y |
	x := self statementsAt: 11.
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
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaise

	| x |
	x := self statementsAt: 19.
	self 
		assert: (x isKindOf: PyRaise);
		assert: (x _exc isKindOf: PyCall);
		assert: (x _exc _function isKindOf: PyName);
		assert: (x _exc _function _id = 'RuntimeError');
		assert: (x _exc _function _ctx isKindOf: PyLoad);
		assert: (x _exc _arguments size == 1);
		assert: ((x _exc _arguments at: 1) isKindOf: PyStr);
		assert: ((x _exc _arguments at: 1) _s = 'Something bad happened');
		assert: (x _exc _keywords size == 0);
		assert: (x _exc _function isKindOf: PyName);
		assert: (x _cause isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaiseFromNone

	| x |
	x := self statementsAt: 20.
	self 
		assert: (x isKindOf: PyRaise);
		assert: (x _exc isKindOf: PyCall);
		assert: (x _exc _function isKindOf: PyName);
		assert: (x _exc _function _id = 'RuntimeError');
		assert: (x _exc _function _ctx isKindOf: PyLoad);
		assert: (x _exc _arguments size == 1);
		assert: ((x _exc _arguments at: 1) isKindOf: PyStr);
		assert: ((x _exc _arguments at: 1) _s = 'Something bad happened');
		assert: (x _exc _keywords size == 0);
		assert: (x _exc _function isKindOf: PyName);
		assert: (x _cause isKindOf: PyNameConstant);
		assert: (x _cause _value isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnNone

	| x y |
	x := self statementsAt: 15.
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
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: PyReturn);
		assert: (y.value isNil);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnTrue

	| x y |
	x := self statementsAt: 16.
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
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: PyReturn);
		assert: (y.value isKindOf: PyNameConstant);
		assert: (y.value.value);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testSwapAssignment

	| x |
	x := self statementsAt: 8.
	self 
		assert: (x isKindOf: PyAssign);
		assert: (x _targets size == 1);
		assert: ((x _targets at: 1) isKindOf: PyTuple);
		assert: (((x _targets at: 1) _elts at: 1) isKindOf: PyName);
		assert: (((x _targets at: 1) _elts at: 1) _id = 'i');
		assert: (((x _targets at: 1) _elts at: 1) _ctx isKindOf: PyStore);
		assert: (((x _targets at: 1) _elts at: 2) isKindOf: PySubscript);
		assert: (((x _targets at: 1) _elts at: 2) _value isKindOf: PyName);
		assert: (((x _targets at: 1) _elts at: 2) _value _id = 'x');
		assert: (((x _targets at: 1) _elts at: 2) _value _ctx isKindOf: PyLoad);
		assert: (((x _targets at: 1) _elts at: 2) _ctx isKindOf: PyStore);
		assert: ((x _targets at: 1) _ctx isKindOf: PyStore);
		assert: (x _value isKindOf: PyTuple);
		assert: (x _value _elts size == 2);
		assert: ((x _value _elts at: 1) isKindOf: PyNum);
		assert: ((x _value _elts at: 1) _n == 1);
		assert: ((x _value _elts at: 2) isKindOf: PyNum);
		assert: ((x _value _elts at: 2) _n == 2);
		assert: (x _value _ctx isKindOf: PyLoad);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYield

	| x y |
	x := self statementsAt: 17.
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
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: PyExpr);
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
	x := self statementsAt: 18.
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
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: PyExpr);
		assert: (y.value isKindOf: PyYield);
		assert: (y.value.value isKindOf: PyNum);
		assert: (y.value.value.n == 123);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
