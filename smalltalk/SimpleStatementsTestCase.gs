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
	x := statements at: 6.
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
		assert: (x _test isKindOf: PyNameConstant);
		assert: (x _test _value);
		assert: (x _msg isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignMultiple

	| x |
	x := statements at: 2.
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
	x := statements at: 1.
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
	x := statements at: 21.
	self 
		assert: (x isKindOf: PyFor);
		assert: (x _target isKindOf: PyName);
		assert: (x _target _id = '_');
		assert: (x _target _ctx isKindOf: PyStore);
		assert: (x _iter isKindOf: PyName);
		assert: (x _iter _id = 'x');
		assert: (x _iter _ctx isKindOf: PyLoad);
		assert: (x _body size = 1);
		assert: ((x _body at: 1) isKindOf: PyBreak);
		assert: (x _orelse size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassAttributeAssignment

	| x |
	x := statements at: 5.
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

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x _name = 'Cls');
		assert: (x _bases size == 0);
		assert: (x _keywords size == 0);
		assert: (x _body size == 1);
		assert: ((x _body at: 1) isKindOf: PyAssign);
		assert: ((x _body at: 1) _targets size == 1);
		assert: (((x _body at: 1) _targets at: 1) isKindOf: PyName);
		assert: (((x _body at: 1) _targets at: 1) _id = 'x');
		assert: (((x _body at: 1) _targets at: 1) _ctx isKindOf: PyStore);
		assert: ((x _body at: 1) _value isKindOf: PyNum);
		assert: ((x _body at: 1) _value _n == 3);
		assert: (x _decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassInstantiation

	| x |
	x := statements at: 4.
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
	x := statements at: 22.
	self 
		assert: (x isKindOf: PyFor);
		assert: (x _target isKindOf: PyName);
		assert: (x _target _id = '_');
		assert: (x _target _ctx isKindOf: PyStore);
		assert: (x _iter isKindOf: PyName);
		assert: (x _iter _id = 'x');
		assert: (x _iter _ctx isKindOf: PyLoad);
		assert: (x _body size = 1);
		assert: ((x _body at: 1) isKindOf: PyContinue);
		assert: (x _orelse size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelMultiple

	| x |
	x := statements at: 14.
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
	x := statements at: 13.
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

	| x |
	x := statements at: 23.
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
	x := statements at: 24.
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
	x := statements at: 7.
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
		assert: (x _name = 'C');
		assert: (x _bases size == 0);
		assert: (x _keywords size == 0);
		assert: (x _body size == 1);
		assert: ((x _body at: 1) isKindOf: PyPass);
		assert: (x _decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testPassFunction

	| x |
	x := statements at: 11.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x _name = 'f');
		assert: (x _args isKindOf: PyArguments);
		assert: ((x _args _args at: 1) isKindOf: PyArg);
		assert: ((x _args _args at: 1) _arg = 'arg');
		assert: ((x _args _args at: 1) _annotation isNil);
		assert: (x _args _vararg isNil);
		assert: (x _args _kwonlyargs size == 0);
		assert: (x _args _kw_defaults size == 0);
		assert: (x _args _kwarg isNil);
		assert: (x _args _defaults size == 0);
		assert: (x _body size == 1);
		assert: ((x _body at: 1) isKindOf: PyPass);
		assert: (x _decorator_list size == 0);
		assert: (x _returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaise

	| x |
	x := statements at: 19.
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
	x := statements at: 20.
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

	| x |
	x := statements at: 15.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x _name = 'a');
		assert: (x _args isKindOf: PyArguments);
		assert: (x _args _args size == 0);
		assert: (x _args _vararg isNil);
		assert: (x _args _kwonlyargs size == 0);
		assert: (x _args _kw_defaults size == 0);
		assert: (x _args _kwarg isNil);
		assert: (x _args _defaults size == 0);
		assert: (x _body size == 1);
		assert: ((x _body at: 1) isKindOf: PyReturn);
		assert: ((x _body at: 1) _value isNil);
		assert: (x _decorator_list size == 0);
		assert: (x _returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnTrue

	| x |
	x := statements at: 16.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x _name = 'b');
		assert: (x _args isKindOf: PyArguments);
		assert: (x _args _args size == 0);
		assert: (x _args _vararg isNil);
		assert: (x _args _kwonlyargs size == 0);
		assert: (x _args _kw_defaults size == 0);
		assert: (x _args _kwarg isNil);
		assert: (x _args _defaults size == 0);
		assert: (x _body size == 1);
		assert: ((x _body at: 1) isKindOf: PyReturn);
		assert: ((x _body at: 1) _value isKindOf: PyNameConstant);
		assert: ((x _body at: 1) _value _value);
		assert: (x _decorator_list size == 0);
		assert: (x _returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testSwapAssignment

	| x |
	x := statements at: 8.
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

	| x |
	x := statements at: 17.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x _name = 'gen');
		assert: (x _args isKindOf: PyArguments);
		assert: (x _args _args size == 0);
		assert: (x _args _vararg isNil);
		assert: (x _args _kwonlyargs size == 0);
		assert: (x _args _kw_defaults size == 0);
		assert: (x _args _kwarg isNil);
		assert: (x _args _defaults size == 0);
		assert: (x _body size == 1);
		assert: ((x _body at: 1) isKindOf: PyExpr);
		assert: ((x _body at: 1) _value isKindOf: PyYield);
		assert: ((x _body at: 1) _value _value isKindOf: PyNum);
		assert: ((x _body at: 1) _value _value _n == 123);
		assert: (x _decorator_list size == 0);
		assert: (x _returns isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYieldAsync

	| x |
	x := statements at: 18.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x _name = 'agen');
		assert: (x _args isKindOf: PyArguments);
		assert: (x _args _args size == 0);
		assert: (x _args _vararg isNil);
		assert: (x _args _kwonlyargs size == 0);
		assert: (x _args _kw_defaults size == 0);
		assert: (x _args _kwarg isNil);
		assert: (x _args _defaults size == 0);
		assert: (x _body size == 1);
		assert: ((x _body at: 1) isKindOf: PyExpr);
		assert: ((x _body at: 1) _value isKindOf: PyYield);
		assert: ((x _body at: 1) _value _value isKindOf: PyNum);
		assert: ((x _body at: 1) _value _value _n == 123);
		assert: (x _decorator_list size == 0);
		assert: (x _returns isNil);
		yourself.
%
