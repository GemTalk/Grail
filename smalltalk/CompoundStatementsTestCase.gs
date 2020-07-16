! ------------------- Remove existing behavior from CompoundStatementsTestCase
expectvalue /Metaclass3       
doit
CompoundStatementsTestCase removeAllMethods.
CompoundStatementsTestCase class removeAllMethods.
%
! ------------------- Class methods for CompoundStatementsTestCase
set compile_env: 0
category: 'other'
classmethod: CompoundStatementsTestCase
filename

	^'CompoundStatements.py'
%
! ------------------- Instance methods for CompoundStatementsTestCase
set compile_env: 0
category: 'other'
method: CompoundStatementsTestCase
testClass

	| x |
	x := self statementsAt: 14.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'Foo');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.bases size == 0);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testClassInheritance

	| x name |
	x := self statementsAt: 15.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'Bar');
		assert: (x.bases size == 1);
		assert: ((name := x.bases at: 1) isKindOf: PyName);
		assert: (name.assoc.key == #'Foo');
		assert: (name.ctx isKindOf: PyLoad);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCoroutine

	| x arguments arg |
	x := self statementsAt: 16.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x.name = 'asyncFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNone);
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCoroutineFor

	| x arguments arg asyncFor call num |
	x := self statementsAt: 17.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x.name = 'asyncForFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNone);
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((asyncFor := x.body.body at: 1) isKindOf: PyAsyncFor);
		assert: (asyncFor.target isKindOf: PyName);
		assert: (asyncFor.target.assoc.key == #'_');
		assert: (asyncFor.target.ctx isKindOf: PyStore);
		assert: ((call := asyncFor.iter) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.assoc.key == #'range');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: PyNum);
		assert: (num.n == 10);
		assert: (call.keywords size == 0);
		assert: (asyncFor.body.body size == 1);
		assert: ((asyncFor.body.body at: 1) isKindOf: PyPass);
		assert: (asyncFor.orelse.body size == 0);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCoroutineWith

	| x arguments arg with withItem name call str1 str2 |
	x := self statementsAt: 18.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x.name = 'asyncWithFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNone);
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 1);		
		assert: ((with := x.body.body at: 1) isKindOf: PyAsyncWith);
		assert: (with.items size == 1);
		assert: ((withItem := with.items at: 1) isKindOf: PyWithItem);
		assert: ((call := withItem.context_expr) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.assoc.key == #'open');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: PyStr);
		assert: (str1.s = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: PyStr);
		assert: (str2.s = 'r');
		assert: (call.keywords size == 0);
		assert: ((name := withItem.optional_vars) isKindOf: PyName);
		assert: (name.assoc.key == #'f');
		assert: (name.ctx isKindOf: PyStore);
		assert: (with.body.body size == 1);
		assert: ((with.body.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testFor
	"For(
		Name('_', Store(), lineno=23, col_offset=4), 
		Call(Name('range', Load(), lineno=23, col_offset=9), [Num(10, lineno=23, col_offset=15)], [], lineno=23, col_offset=9), 
		[Pass(lineno=24, col_offset=1)], [], lineno=23, col_offset=0)"

	| x name call num |
	x := self statementsAt: 5.
	self 
		assert: (x isKindOf: PyFor);
		assert: ((name := x.target) isKindOf: PyName);
		assert: (name.assoc.key == #'_');
		assert: (name.ctx isKindOf: PyStore);
		assert: ((call := x.iter) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.assoc.key == #'range');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: PyNum);
		assert: (num.n == 10);
		assert: (call.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.orelse size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testForElse
	"For(
		Name('_', Store(), lineno=26, col_offset=4), 
		Call(Name('range', Load(), lineno=26, col_offset=9), [Num(10, lineno=26, col_offset=15)], [], lineno=26, col_offset=9), 
		[Pass(lineno=27, col_offset=1)], 
		[Pass(lineno=29, col_offset=1)], lineno=26, col_offset=0)"

	| x name call num |
	x := self statementsAt: 6.
	self 
		assert: (x isKindOf: PyFor);
		assert: ((name := x.target) isKindOf: PyName);
		assert: (name.assoc.key == #'_');
		assert: (name.ctx isKindOf: PyStore);
		assert: ((call := x.iter) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.assoc.key == #'range');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: PyNum);
		assert: (num.n == 10);
		assert: (call.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.orelse.body size == 1);
		assert: ((x.orelse.body at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testFunctionWithOneArgument

	| x arguments arg |
	x := self statementsAt: 10.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'func');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 0); 
		assert: (x.body.body size == 1); 
		assert: ((x.body.body at: 1) isKindOf: PyPass); 
		assert: (x.decorator_list size == 0); 
		assert: (x.returns isNone); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testFunctionWithOneDecorator

	| x arguments arg name |
	x := self statementsAt: 11.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'decoratedFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 0); 
		assert: (x.body.body size == 1); 
		assert: ((x.body.body at: 1) isKindOf: PyPass); 
		assert: (x.decorator_list size == 1); 
		assert: ((name := x.decorator_list at: 1) isKindOf: PyName); 
		assert: (name.assoc.key == #'func'); 
		assert: (name.ctx isKindOf: PyLoad); 
		assert: (x.returns isNone); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testFunctionWithOneDefaultValueParameter

	| x arguments arg nameConstant |
	x := self statementsAt: 12.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'defaultParameterValueFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 1);
		assert: ((nameConstant := arguments.defaults at: 1) isKindOf: PyNone);
		assert: (nameConstant isNone);
		assert: (x.body.body size == 1); 
		assert: ((x.body.body at: 1) isKindOf: PyPass); 
		assert: (x.decorator_list size == 0); 
		assert: (x.returns isNone); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testIf
	"If(NameConstant(True, lineno=5, col_offset=3), [Pass(lineno=6, col_offset=1)], [], lineno=5, col_offset=0)"

	| x |
	x := self statementsAt: 1.
	self 
		assert: (x isKindOf: PyIf);
		assert: (x.test isKindOf: PyTrue);
		assert: (x.test evaluate);
		assert: (x.body isKindOf: PySuite);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.orelse isKindOf: PySuite);
		assert: (x.orelse.body size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testIfElse
	"If(NameConstant(False, lineno=8, col_offset=3), [Pass(lineno=9, col_offset=1)], [Pass(lineno=11, col_offset=1)], lineno=8, col_offset=0)"

	| x |
	x := self statementsAt: 2.
	self 
		assert: (x isKindOf: PyIf);
		assert: (x.test isKindOf: PyFalse);
		deny: x.test evaluate;
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.orelse.body size == 1);
		assert: ((x.orelse.body at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testNestedFunction

	| x arguments arg functionDef insideArguments insideArg return |
	x := self statementsAt: 13.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'nestedFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 2); 
		assert: ((functionDef := x.body.body at: 1) isKindOf: PyFunctionDef); 
		assert: (functionDef.name = 'insideFunc'); 
		assert: ((insideArguments := functionDef.args) isKindOf: PyArguments); 
		assert: (insideArguments.args size == 1);
		assert: ((insideArg := insideArguments.args at: 1) isKindOf: PyArg);
		assert: (insideArg.arg = 'insideArg');
		assert: (insideArg.annotation isNone);
		assert: (insideArguments.vararg isNone); 
		assert: (insideArguments.kwonlyargs size == 0); 
		assert: (insideArguments.kw_defaults size == 0); 
		assert: (insideArguments.kwarg isNone); 
		assert: (insideArguments.defaults size == 0);
		assert: (functionDef.body.body size == 1);
		assert: ((functionDef.body.body at: 1) isKindOf: PyPass);
		assert: (functionDef.decorator_list size == 0);
		assert: (functionDef.returns isNone);
		assert: ((return := x.body.body at: 2) isKindOf: PyReturn);
		assert: (return.value isKindOf: PyName);
		assert: (return.value.assoc.key == #'insideFunc');
		assert: (return.value.ctx isKindOf: PyLoad);
		assert: (x.decorator_list size == 0); 
		assert: (x.returns isNone); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testTry
	"Try(
		[Expr(
			Call(Name('print', Load(), lineno=33, col_offset=4), 
				[BinOp(Num(1, lineno=33, col_offset=10), Div(), Num(0, lineno=33, col_offset=14), lineno=33, col_offset=10)], 
				[], lineno=33, col_offset=4), lineno=33, col_offset=4)], 
		[ExceptHandler(None, None, 
			[Raise(
				Call(
					Name('RuntimeError', Load(), lineno=35, col_offset=10), 
					[Str('Something bad happened', lineno=35, col_offset=23)], [], lineno=35, col_offset=10), None, lineno=35, col_offset=4)], lineno=34, col_offset=0)], [], [], lineno=32, col_offset=0)"

	| x expr call binOp exceptHandler raise insideCall str |
	x :=self statementsAt: 7.
	self 
		assert: (x isKindOf: PyTry);
		assert: (x.body.body size == 1);
		assert: ((expr := x.body.body at: 1) isKindOf: PyExpr);
		assert: ((call := expr.value) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.assoc.key == #'print');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size == 1);
		assert: ((binOp := call.arguments at: 1) isKindOf: PyBinOp);
		assert: (binOp.left isKindOf: PyNum);
		assert: (binOp.left.n == 1);
		assert: (binOp.op isKindOf: PyDiv);
		assert: (binOp.right isKindOf: PyNum);
		assert: (binOp.right.n == 0);
		assert: (call.keywords size == 0);
		assert: (x.handlers size == 1);
		assert: ((exceptHandler := x.handlers at: 1) isKindOf: PyExceptHandler);
		assert: (exceptHandler.type isNone);
		assert: (exceptHandler.name isNone);
		assert: (exceptHandler.body.body size == 1);
		assert: ((raise := exceptHandler.body.body at: 1) isKindOf: PyRaise);
		assert: ((insideCall := raise.exc) isKindOf: PyCall);
		assert: (insideCall.function isKindOf: PyName);
		assert: (insideCall.arguments size == 1);
		assert: ((str := insideCall.arguments at: 1) isKindOf: PyStr);
		assert: (str.s = 'Something bad happened');
		assert: (insideCall.keywords size == 0);
		assert: (raise.cause isNone);
		assert: (x.orelse size == 0);
		assert: (x.finalbody size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testWhile
	"While(NameConstant(True, lineno=14, col_offset=6), [Pass(lineno=15, col_offset=1)], [], lineno=14, col_offset=0)"

	| x |
	x := self statementsAt: 3.
	self 
		assert: (x isKindOf: PyWhile);
		assert: (x.test isKindOf: PyTrue);
		assert: x.test evaluate;
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.orelse.body size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testWhileElse
	"While(NameConstant(False, lineno=17, col_offset=6), [Pass(lineno=18, col_offset=1)], [Pass(lineno=20, col_offset=1)], lineno=17, col_offset=0)"

	| x |
	x := self statementsAt: 4.
	self 
		assert: (x isKindOf: PyWhile);
		assert: (x.test isKindOf: PyFalse);
		deny: x.test evaluate;
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		assert: (x.orelse.body size == 1);
		assert: ((x.orelse.body at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testWith
	"With([
		withitem(
			Call(Name('open', Load(), lineno=41, col_offset=5), 
				[Str('/etc/passwd', lineno=41, col_offset=10), 
				Str('r', lineno=41, col_offset=25)], [], lineno=41, col_offset=5), None)], 
		[Pass(lineno=42, col_offset=4)], lineno=41, col_offset=0)"

	| x withItem call str1 str2 |
	x := self statementsAt: 9.
	self 
		assert: (x isKindOf: PyWith);
		assert: (x.items size == 1);
		assert: ((withItem := x.items at: 1) isKindOf: PyWithItem);
		assert: ((call := withItem.context_expr) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.assoc.key == #'open');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: PyStr);
		assert: (str1.s = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: PyStr);
		assert: (str2.s = 'r');
		assert: (call.keywords size == 0);
		assert: (withItem.optional_vars isNone);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testWithOptionalVars
	"With(
		[withitem(
			Call(Name('open', Load(), lineno=38, col_offset=5), 
				[Str('/etc/passwd', lineno=38, col_offset=10), Str('r', lineno=38, col_offset=25)], [], lineno=38, col_offset=5), 
			Name('f', Store(), lineno=38, col_offset=33))], 
		[Pass(lineno=39, col_offset=4)], lineno=38, col_offset=0)"

	| x withItem call str1 str2 name |
	x := self statementsAt: 8.
	self 
		assert: (x isKindOf: PyWith);
		assert: (x.items size == 1);
		assert: ((withItem := x.items at: 1) isKindOf: PyWithItem);
		assert: ((call := withItem.context_expr) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.assoc.key == #'open');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: PyStr);
		assert: (str1.s = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: PyStr);
		assert: (str2.s = 'r');
		assert: (call.keywords size == 0);
		assert: ((name := withItem.optional_vars) isKindOf: PyName);
		assert: (name.assoc.key == #'f');
		assert: (name.ctx isKindOf: PyStore);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PyPass);
		yourself.
%
