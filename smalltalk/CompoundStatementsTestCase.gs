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
		assert: (x isKindOf: ClassDefAst);
		assert: (x.name == #'Foo');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: ClassDefAst);
		assert: (x.name == #'Bar');
		assert: (x.bases size == 1);
		assert: ((name := x.bases at: 1) isKindOf: NameAst);
		assert: (name.id == #'Foo');
		assert: (name.ctx isKindOf: LoadAst);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testCompression
"
# cpython/Lib/importlib/_bootstrap.py:321
if any(arg is not None for arg in []):	# 20
	pass

	If(
		Call(
			Name('any', Load(), lineno=84, col_offset=3), 
			[GeneratorExp(
				Compare(
					Name('arg', Load(), lineno=84, col_offset=7), 
					[IsNot()], 
					[NameConstant(None, lineno=84, col_offset=18)], 
				lineno=84, col_offset=7), 
				[comprehension(
					Name('arg', Store(), lineno=84, col_offset=27), 
					list([], Load(), lineno=84, col_offset=34), [], 0
				)]
			, lineno=84, col_offset=7)], 
			[], 
		lineno=84, col_offset=3), 
		[Pass( lineno=85, col_offset=1)], 
		[], 
	lineno=84, col_offset=0)])
"
	| x |
	x := self statementsAt: 20.
%
category: 'other'
method: CompoundStatementsTestCase
testCoroutine

	| x arguments arg |
	x := self statementsAt: 16.
	self 
		assert: (x isKindOf: AsyncFunctionDefAst);
		assert: (x.name = 'asyncFunc');
		assert: ((arguments := x.args) isKindOf: ArgumentsAst);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: ArgAst);
		assert: (arg.arg == #'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNone);
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: AsyncFunctionDefAst);
		assert: (x.name = 'asyncForFunc');
		assert: ((arguments := x.args) isKindOf: ArgumentsAst);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: ArgAst);
		assert: (arg.arg == #'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNone);
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((asyncFor := x.body.body at: 1) isKindOf: AsyncForAst);
		assert: (asyncFor.target isKindOf: NameAst);
		assert: (asyncFor.target.id == #'_');
		assert: (asyncFor.target.ctx isKindOf: StoreAst);
		assert: ((call := asyncFor.iter) isKindOf: CallAst);
		assert: (call.function isKindOf: NameAst);
		assert: (call.function.id == #'range');
		assert: (call.function.ctx isKindOf: LoadAst);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: ConstantAst);
		assert: (num.value.number == 10);
		assert: (call.keywords size == 0);
		assert: (asyncFor.body.body size == 1);
		assert: ((asyncFor.body.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: AsyncFunctionDefAst);
		assert: (x.name = 'asyncWithFunc');
		assert: ((arguments := x.args) isKindOf: ArgumentsAst);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: ArgAst);
		assert: (arg.arg == #'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone);
		assert: (arguments.kwonlyargs size == 0);
		assert: (arguments.kw_defaults size == 0);
		assert: (arguments.kwarg isNone);
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 1);		
		assert: ((with := x.body.body at: 1) isKindOf: AsyncWithAst);
		assert: (with.items size == 1);
		assert: ((withItem := with.items at: 1) isKindOf: WithItemAst);
		assert: ((call := withItem.context_expr) isKindOf: CallAst);
		assert: (call.function isKindOf: NameAst);
		assert: (call.function.id == #'open');
		assert: (call.function.ctx isKindOf: LoadAst);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: ConstantAst);
		assert: (str1.value.container = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: ConstantAst);
		assert: (str2.value.container = 'r');
		assert: (call.keywords size == 0);
		assert: ((name := withItem.optional_vars) isKindOf: NameAst);
		assert: (name.id == #'f');
		assert: (name.ctx isKindOf: StoreAst);
		assert: (with.body.body size == 1);
		assert: ((with.body.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: ForAst);
		assert: ((name := x.target) isKindOf: NameAst);
		assert: (name.id == #'_');
		assert: (name.ctx isKindOf: StoreAst);
		assert: ((call := x.iter) isKindOf: CallAst);
		assert: (call.function isKindOf: NameAst);
		assert: (call.function.id == #'range');
		assert: (call.function.ctx isKindOf: LoadAst);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: ConstantAst);
		assert: (num.value.number == 10);
		assert: (call.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: ForAst);
		assert: ((name := x.target) isKindOf: NameAst);
		assert: (name.id == #'_');
		assert: (name.ctx isKindOf: StoreAst);
		assert: ((call := x.iter) isKindOf: CallAst);
		assert: (call.function isKindOf: NameAst);
		assert: (call.function.id == #'range');
		assert: (call.function.ctx isKindOf: LoadAst);
		assert: (call.arguments size == 1);
		assert: ((num := call.arguments at: 1) isKindOf: ConstantAst);
		assert: (num.value.number == 10);
		assert: (call.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.orelse.body size == 1);
		assert: ((x.orelse.body at: 1) isKindOf: PassAst);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testFunctionWithOneArgument

	| x arguments arg |
	x := self statementsAt: 10.
	self 
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'func');
		assert: ((arguments := x.args) isKindOf: ArgumentsAst);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: ArgAst);
		assert: (arg.arg == #'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 0); 
		assert: (x.body.body size == 1); 
		assert: ((x.body.body at: 1) isKindOf: PassAst); 
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
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'decoratedFunc');
		assert: ((arguments := x.args) isKindOf: ArgumentsAst);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: ArgAst);
		assert: (arg.arg == #'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 0); 
		assert: (x.body.body size == 1); 
		assert: ((x.body.body at: 1) isKindOf: PassAst); 
		assert: (x.decorator_list size == 1); 
		assert: ((name := x.decorator_list at: 1) == #'func'); 
		assert: (x.returns isNone); 
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testFunctionWithOneDefaultValueParameter

	| x arguments arg nameConstant |
	x := self statementsAt: 12.
	self 
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'defaultParameterValueFunc');
		assert: ((arguments := x.args) isKindOf: ArgumentsAst);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: ArgAst);
		assert: (arg.arg == #'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 1);
		assert: ((nameConstant := arguments.defaults at: 1) isKindOf: ConstantAst);
		assert: (nameConstant.value == None);
		assert: (x.body.body size == 1); 
		assert: ((x.body.body at: 1) isKindOf: PassAst); 
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
		assert: (x isKindOf: IfAst);
		assert: (x.test isKindOf: ConstantAst);
		assert: (x.test.value == True);
		assert: (x.test evaluate: aScope);
		assert: (x.body isKindOf: SuiteAst);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.orelse isKindOf: SuiteAst);
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
		assert: (x isKindOf: IfAst);
		assert: (x.test isKindOf: ConstantAst);
		assert: (x.test.value == False);
		assert: (x.test evaluate: aScope) == False;
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.orelse.body size == 1);
		assert: ((x.orelse.body at: 1) isKindOf: PassAst);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testNestedFunction

	| x arguments arg functionDef insideArguments insideArg return |
	x := self statementsAt: 13.
	self 
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'nestedFunc');
		assert: ((arguments := x.args) isKindOf: ArgumentsAst);
		assert: (arguments.args size == 1);
		assert: ((arg := arguments.args at: 1) isKindOf: ArgAst);
		assert: (arg.arg == #'arg');
		assert: (arg.annotation isNone);
		assert: (arguments.vararg isNone); 
		assert: (arguments.kwonlyargs size == 0); 
		assert: (arguments.kw_defaults size == 0); 
		assert: (arguments.kwarg isNone); 
		assert: (arguments.defaults size == 0);
		assert: (x.body.body size == 2); 
		assert: ((functionDef := x.body.body at: 1) isKindOf: FunctionDefAst); 
		assert: (functionDef.name == #'insideFunc'); 
		assert: ((insideArguments := functionDef.args) isKindOf: ArgumentsAst); 
		assert: (insideArguments.args size == 1);
		assert: ((insideArg := insideArguments.args at: 1) isKindOf: ArgAst);
		assert: (insideArg.arg == #'insideArg');
		assert: (insideArg.annotation isNone);
		assert: (insideArguments.vararg isNone); 
		assert: (insideArguments.kwonlyargs size == 0); 
		assert: (insideArguments.kw_defaults size == 0); 
		assert: (insideArguments.kwarg isNone); 
		assert: (insideArguments.defaults size == 0);
		assert: (functionDef.body.body size == 1);
		assert: ((functionDef.body.body at: 1) isKindOf: PassAst);
		assert: (functionDef.decorator_list size == 0);
		assert: (functionDef.returns isNone);
		assert: ((return := x.body.body at: 2) isKindOf: ReturnAst);
		assert: (return.value isKindOf: NameAst);
		assert: (return.value.id == #'insideFunc');
		assert: (return.value.ctx isKindOf: LoadAst);
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

	| x expr call binOp exceptHandler raise insideCall string |
	x :=self statementsAt: 7.
	self 
		assert: (x isKindOf:TryAst);
		assert: (x.body.body size == 1);
		assert: ((expr := x.body.body at: 1) isKindOf: ExprAst);
		assert: ((call := expr.value) isKindOf: CallAst);
		assert: (call.function isKindOf: NameAst);
		assert: (call.function.id == #'print');
		assert: (call.function.ctx isKindOf: LoadAst);
		assert: (call.arguments size == 1);
		assert: ((binOp := call.arguments at: 1) isKindOf: BinOpAst);
		assert: (binOp.left isKindOf: ConstantAst);
		assert: (binOp.left.value.number == 1);
		assert: (binOp.op isKindOf: DivAst);
		assert: (binOp.right isKindOf: ConstantAst);
		assert: (binOp.right.value.number == 0);
		assert: (call.keywords size == 0);
		assert: (x.handlers size == 1);
		assert: ((exceptHandler := x.handlers at: 1) isKindOf: ExceptHandlerAst);
		assert: (exceptHandler.type isNone);
		assert: (exceptHandler.name isKindOf: NoneAst);
		assert: (exceptHandler.body.body size == 1);
		assert: ((raise := exceptHandler.body.body at: 1) isKindOf: RaiseAst);
		assert: ((insideCall := raise.exc) isKindOf: CallAst);
		assert: (insideCall.function isKindOf: NameAst);
		assert: (insideCall.arguments size == 1);
		assert: ((string := insideCall.arguments at: 1) isKindOf: ConstantAst);
		assert: (string.value.container = 'Something bad happened');
		assert: (insideCall.keywords size == 0);
		assert: (raise.cause isNone);
		assert: (x.orelse size == 0);
		assert: (x.finalbody size == 0);
		yourself.
%
category: 'other'
method: CompoundStatementsTestCase
testVarArgs
"
    arguments = (
		arg* posonlyargs, 	# added in 3.8
		arg* args, 
		arg? vararg, 
		arg* kwonlyargs,
		expr* kw_defaults, 
		arg? kwarg, 
		expr* defaults)

	FunctionDef('fun', 
		arguments(
			[arg('f', None, lineno=80, col_offset=8)], 
			arg('args', None, lineno=80, col_offset=12), 
			[], 
			[], 
			arg('kwds', None, lineno=80, col_offset=20), 
			[]
		), [
			Return(
				Call(
					Name('f', Load(), lineno=81, col_offset=8), 
					[
						Starred(Name('args', Load(), lineno=81, col_offset=11), Load(), lineno=81, col_offset=10)], 
						[
							keyword(None, Name('kwds', Load(), lineno=81, col_offset=19))
						], lineno=81, col_offset=8
				), lineno=81, col_offset=1
			)
		]
	, [], None, lineno=80, col_offset=0
	)
"
	| x |
	x := self statementsAt: 19.
	x := x evaluate: aScope.
%
category: 'other'
method: CompoundStatementsTestCase
testWhile
	"While(NameConstant(True, lineno=14, col_offset=6), [Pass(lineno=15, col_offset=1)], [], lineno=14, col_offset=0)"

	| x |
	x := self statementsAt: 3.
	self 
		assert: (x isKindOf: WhileAst);
		assert: (x.test isKindOf: ConstantAst);
		assert: (x.test.value == True);
		assert: (x.test evaluate: aScope);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: WhileAst);
		assert: (x.test isKindOf: ConstantAst);
		assert: (x.test.value == False);
		assert:  (x.test evaluate: aScope) == False;
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.orelse.body size == 1);
		assert: ((x.orelse.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: WithAst);
		assert: (x.items size == 1);
		assert: ((withItem := x.items at: 1) isKindOf: WithItemAst);
		assert: ((call := withItem.context_expr) isKindOf: CallAst);
		assert: (call.function isKindOf: NameAst);
		assert: (call.function.id == #'open');
		assert: (call.function.ctx isKindOf: LoadAst);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: ConstantAst);
		assert: (str1.value.container = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: ConstantAst);
		assert: (str2.value.container = 'r');
		assert: (call.keywords size == 0);
		assert: (withItem.optional_vars isNone);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
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
		assert: (x isKindOf: WithAst);
		assert: (x.items size == 1);
		assert: ((withItem := x.items at: 1) isKindOf: WithItemAst);
		assert: ((call := withItem.context_expr) isKindOf: CallAst);
		assert: (call.function isKindOf: NameAst);
		assert: (call.function.id == #'open');
		assert: (call.function.ctx isKindOf: LoadAst);
		assert: (call.arguments size = 2);
		assert: ((str1 := call.arguments at: 1) isKindOf: ConstantAst);
		assert: (str1.value.container = '/etc/passwd');
		assert: ((str2 := call.arguments at: 2) isKindOf: ConstantAst);
		assert: (str2.value.container = 'r');
		assert: (call.keywords size == 0);
		assert: ((name := withItem.optional_vars) isKindOf: NameAst);
		assert: (name.id == #'f');
		assert: (name.ctx isKindOf: StoreAst);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		yourself.
%
