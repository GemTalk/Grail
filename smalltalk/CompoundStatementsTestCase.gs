! ------------------- Remove existing behavior from CompoundStatementsTestCase
expectvalue /Metaclass3       
doit
CompoundStatementsTestCase removeAllMethods.
CompoundStatementsTestCase class removeAllMethods.
%
! ------------------- Class methods for CompoundStatementsTestCase
! ------------------- Instance methods for CompoundStatementsTestCase
set compile_env: 0
category: 'other'
method: CompoundStatementsTestCase
filename

	^'CompoundStatements.py'
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementClass

	| x |
	x := statements at: 14.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'Foo');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.bases size == 0);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementClassInheritance

	| x name |
	x := statements at: 15.
	self 
		assert: (x isKindOf: PyClassDef);
		assert: (x.name = 'Bar');
		assert: (x.bases size == 1);
		assert: ((name := x.bases at: 1) isKindOf: PyName);
		assert: (name.id = 'Foo');
		assert: (name.ctx isKindOf: PyLoad);
		assert: (x.keywords size == 0);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementCoroutine

	| x arguments arg |
	x := statements at: 16.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x.name = 'asyncFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNil);
		assert: (arguments.vararg isNil);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNil);
		assert: (arguments.defaults size == 0);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementCoroutineFor

	| x arguments arg asyncFor call num |
	x := statements at: 17.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x.name = 'asyncForFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNil);
		assert: (arguments.vararg isNil);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNil);
		assert: (arguments.defaults size == 0);
		assert: (x.body size == 1);
		assert: ((asyncFor := x.body at: 1) isKindOf: PyAsyncFor);
		assert: (asyncFor.target isKindOf: PyName);
		assert: (asyncFor.target.id = '_');
		assert: (asyncFor.target.ctx isKindOf: PyStore);
		assert: ((call := asyncFor.iter) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.id = 'range');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: PyNum);
		assert: (num.n == 10);
		assert: (call.keywords size == 0);
		assert: (asyncFor.body size == 1);
		assert: ((asyncFor.body at: 1) isKindOf: PyPass);
		assert: (asyncFor.orelse size == 0);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementCoroutineWith

	| x arguments arg with withItem name call str1 str2 num |
	x := statements at: 18.
	self 
		assert: (x isKindOf: PyAsyncFunctionDef);
		assert: (x.name = 'asyncWithFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNil);
		assert: (arguments.vararg isNil);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNil);
		assert: (arguments.defaults size == 0);
		assert: (x.body size == 1);		
		assert: ((with := x.body at: 1) isKindOf: PyAsyncWith);
		assert: (with.items size == 1);
		assert: ((withItem := with.items at: 1) isKindOf: PyWithItem);
		assert: ((call := withItem.context_expr) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.id = 'open');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: PyStr);
		assert: (str1.s = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: PyStr);
		assert: (str2.s = 'r');
		assert: (call.keywords size == 0);
		assert: ((name := withItem.optional_vars) isKindOf: PyName);
		assert: (name.id = 'f');
		assert: (name.ctx isKindOf: PyStore);
		assert: (with.body size == 1);
		assert: ((with.body at: 1) isKindOf: PyPass);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNil);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementFor

	| x name call num |
	x := statements at: 5.
	self 
		assert: (x isKindOf: PyFor);
		assert: ((name := x.target) isKindOf: PyName);
		assert: (name.id = '_');
		assert: (name.ctx isKindOf: PyStore);
		assert: ((call := x.iter) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.id = 'range');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: PyNum);
		assert: (num.n == 10);
		assert: (call.keywords size == 0);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.orelse size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementForElse

	| x name call num |
	x := statements at: 6.
	self 
		assert: (x isKindOf: PyFor);
		assert: ((name := x.target) isKindOf: PyName);
		assert: (name.id = '_');
		assert: (name.ctx isKindOf: PyStore);
		assert: ((call := x.iter) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.id = 'range');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: PyNum);
		assert: (num.n == 10);
		assert: (call.keywords size == 0);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.orelse size == 1);
		assert: ((x.orelse at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementFunctionWithOneArgument

	| x arguments arg |
	x := statements at: 10.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'func');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNil);
		assert: (arguments.vararg isNil); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNil); 
		assert: (arguments.defaults size == 0); 
		assert: (x.body size == 1); 
		assert: ((x.body at: 1) isKindOf: PyPass); 
		assert: (x.decorator_list size == 0); 
		assert: (x.returns isNil); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementFunctionWithOneDecorator

	| x arguments arg name |
	x := statements at: 11.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'decoratedFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNil);
		assert: (arguments.vararg isNil); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNil); 
		assert: (arguments.defaults size == 0); 
		assert: (x.body size == 1); 
		assert: ((x.body at: 1) isKindOf: PyPass); 
		assert: (x.decorator_list size == 1); 
		assert: ((name := x.decorator_list at: 1) isKindOf: PyName); 
		assert: (name.id = 'func'); 
		assert: (name.ctx isKindOf: PyLoad); 
		assert: (x.returns isNil); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementFunctionWithOneDefaultValueParameter

	| x arguments arg nameConstant value |
	x := statements at: 12.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'defaultParameterValueFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNil);
		assert: (arguments.vararg isNil); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNil); 
		assert: (arguments.defaults size == 1);
		assert: ((nameConstant := arguments.defaults at: 1) isKindOf: PyNameConstant);
		assert: (nameConstant.value isNil);
		assert: (x.body size == 1); 
		assert: ((x.body at: 1) isKindOf: PyPass); 
		assert: (x.decorator_list size == 0); 
		assert: (x.returns isNil); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementIf

	| x |
	x := statements at: 1.
	self 
		assert: (x isKindOf: PyIf);
		assert: (x.test isKindOf: PyNameConstant);
		assert: (x.test.value);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.orelse size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementIfElse

	| x |
	x := statements at: 2.
	self 
		assert: (x isKindOf: PyIf);
		assert: (x.test isKindOf: PyNameConstant);
		deny: x.test.value;
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.orelse size == 1);
		assert: ((x.orelse at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementNestedFunction

	| x arguments arg value functionDef insideArguments insideArg return |
	x := statements at: 13.
	self 
		assert: (x isKindOf: PyFunctionDef);
		assert: (x.name = 'nestedFunc');
		assert: ((arguments := x.args) isKindOf: PyArguments);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: PyArg);
		assert: (arg.arg = 'arg');
		assert: (arg.annotation isNil);
		assert: (arguments.vararg isNil); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNil); 
		assert: (arguments.defaults size == 0);
		assert: (x.body size == 2); 
		assert: ((functionDef := x.body at: 1) isKindOf: PyFunctionDef); 
		assert: (functionDef.name = 'insideFunc'); 
		assert: ((insideArguments := functionDef.args) isKindOf: PyArguments); 
		assert: (insideArguments.args size == 1);
		assert: ((insideArg := insideArguments.args at: 1) isKindOf: PyArg);
		assert: (insideArg.arg = 'insideArg');
		assert: (insideArg.annotation isNil);
		assert: (insideArguments.vararg isNil); 
		assert: (insideArguments.kwonlyargs size == 0); 
		assert: (insideArguments.kw_defaults size == 0); 
		assert: (insideArguments.kwarg isNil); 
		assert: (insideArguments.defaults size == 0);
		assert: (functionDef.body size == 1);
		assert: ((functionDef.body at: 1) isKindOf: PyPass);
		assert: (functionDef.decorator_list size == 0);
		assert: (functionDef.returns isNil);
		assert: ((return := x.body at: 2) isKindOf: PyReturn);
		assert: (return.value isKindOf: PyName);
		assert: (return.value.id = 'insideFunc');
		assert: (return.value.ctx isKindOf: PyLoad);
		assert: (x.decorator_list size == 0); 
		assert: (x.returns isNil); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementTry

	| x expr call binOp exceptHandler raise insideCall str |
	x := statements at: 7.
	self 
		assert: (x isKindOf: PyTry);
		assert: (x.body size == 1);
		assert: ((expr := x.body at: 1) isKindOf: PyExpr);
		assert: ((call := expr.value) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.id = 'print');
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
		assert: (exceptHandler.type isNil);
		assert: (exceptHandler.name isNil);
		assert: (exceptHandler.body size == 1);
		assert: ((raise := exceptHandler.body at: 1) isKindOf: PyRaise);
		assert: ((insideCall := raise.exc) isKindOf: PyCall);
		assert: (insideCall.function isKindOf: PyName);
		assert: (insideCall.arguments size == 1);
		assert: ((str := insideCall.arguments at: 1) isKindOf: PyStr);
		assert: (str.s = 'Something bad happened');
		assert: (insideCall.keywords size == 0);
		assert: (raise.cause isNil);
		assert: (x.orelse size == 0);
		assert: (x.finalbody size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementWhile

	| x |
	x := statements at: 3.
	self 
		assert: (x isKindOf: PyWhile);
		assert: (x.test isKindOf: PyNameConstant);
		assert: x.test.value;
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.orelse size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementWhileElse

	| x |
	x := statements at: 4.
	self 
		assert: (x isKindOf: PyWhile);
		assert: (x.test isKindOf: PyNameConstant);
		deny: x.test.value;
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		assert: (x.orelse size == 1);
		assert: ((x.orelse at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementWith

	| x withItem call str1 str2 |
	x := statements at: 9.
	self 
		assert: (x isKindOf: PyWith);
		assert: (x.items size == 1);
		assert: ((withItem := x.items at: 1) isKindOf: PyWithItem);
		assert: ((call := withItem.context_expr) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.id = 'open');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: PyStr);
		assert: (str1.s = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: PyStr);
		assert: (str2.s = 'r');
		assert: (call.keywords size == 0);
		assert: (withItem.optional_vars isNil);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompoundStatementWithOptionalVars

	| x withItem call str1 str2 name |
	x := statements at: 8.
	self 
		assert: (x isKindOf: PyWith);
		assert: (x.items size == 1);
		assert: ((withItem := x.items at: 1) isKindOf: PyWithItem);
		assert: ((call := withItem.context_expr) isKindOf: PyCall);
		assert: (call.function isKindOf: PyName);
		assert: (call.function.id = 'open');
		assert: (call.function.ctx isKindOf: PyLoad);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: PyStr);
		assert: (str1.s = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: PyStr);
		assert: (str2.s = 'r');
		assert: (call.keywords size == 0);
		assert: ((name := withItem.optional_vars) isKindOf: PyName);
		assert: (name.id = 'f');
		assert: (name.ctx isKindOf: PyStore);
		assert: (x.body size == 1);
		assert: ((x.body at: 1) isKindOf: PyPass);
		yourself.
%
