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
	x := self statementsAt: 6.
	self 
		assert: (x isKindOf:AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.assoc.key == #'x');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: ListAst);
		assert: (x.value.elts size == 2);
		assert: ((y := x.value.elts at: 1) isKindOf: NumAst);
		assert: (y.n == 0);
		assert: ((y := x.value.elts at: 2) isKindOf: NumAst);
		assert: (y.n == 1);
		assert: (x.value.ctx isKindOf: LoadAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssertFalse

	| x |
	x := self statementsAt: 10.
	self 
		assert: (x isKindOf: AssertAst);
		assert: (x.test isKindOf: FalseAst);
		deny: x.test evaluate;
		assert: x.msg isNone;
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssertTrue

	| x |
	x := self statementsAt: 9.
	self 
		assert: (x isKindOf: AssertAst);
		assert: (x.test isKindOf: TrueAst);
		assert: (x.test evaluate);
		assert: (x.msg isNone);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignMultiple

	| x y |
	x := self statementsAt: 2.
	self 
		assert: (x isKindOf: AssignAst);
		assert: (x.value isKindOf: NumAst);
		assert: (x.value.n == 2);
		assert: (x.targets size == 2);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.assoc.key == #'var2');
		assert: (y.ctx isKindOf: StoreAst);
		assert: ((y := x.targets at: 2) isKindOf: NameAst);
		assert: (y.assoc.key == #'var3');
		assert: (y.ctx isKindOf: StoreAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignSingle

	| x y |
	x := self statementsAt: 1.
	self 
		assert: (x isKindOf: AssignAst);
		assert: (x.value isKindOf: NumAst);
		assert: (x.value.n == 1);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.assoc.key == #'var1');
		assert: (y.ctx isKindOf: StoreAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testBreak

	| x |
	x := self statementsAt: 21.
	self 
		assert: (x isKindOf: ForAst);
		assert: (x.target isKindOf: NameAst);
		assert: (x.target.assoc.key = #'_');
		assert: (x.target.ctx isKindOf: StoreAst);
		assert: (x.iter isKindOf: NameAst);
		assert: (x.iter.assoc.key = #'x');
		assert: (x.iter.ctx isKindOf: LoadAst);
		assert: (x.body.body size = 1);
		assert: ((x.body.body at: 1) isKindOf: BreakAst);
		assert: (x.orelse.body size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassAttributeAssignment

	| x y |
	x := self statementsAt: 5.
	self 
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: AttributeAst);
		assert: (y.value isKindOf: NameAst);
		assert: y.value.assoc.key == #'inst';
		assert: (y.value.ctx isKindOf: LoadAst);
		assert: (y.attr == #'x');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: BinOpAst);
		assert: (x.value.left isKindOf: AttributeAst);
		assert: (x.value.left.value isKindOf: NameAst);
		assert: (x.value.left.value.assoc.key == #'inst');
		assert: (x.value.left.value.ctx isKindOf: LoadAst);
		assert: (x.value.left.attr == #'x');
		assert: (x.value.left.ctx isKindOf: LoadAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassDefCls

	| x y z |
	x := self statementsAt: 3.
	self 
		assert: (x isKindOf: ClassDefAst);
		assert: (x.name = 'Cls');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: AssignAst);
		assert: (y.targets size == 1);
		assert: ((z := y.targets at: 1) isKindOf: NameAst);
		assert: (z.assoc.key == #'x');
		assert: (z.ctx isKindOf: StoreAst);
		assert: (y.value isKindOf: NumAst);
		assert: (y.value.n == 3);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassInstantiation

	| x y |
	x := self statementsAt: 4.
	self 
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.assoc.key == #'inst');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: CallAst);
		assert: (x.value.function isKindOf: NameAst);
		assert: (x.value.function.assoc.key == #'Cls');
		assert: (x.value.function.ctx isKindOf: LoadAst);
		assert: (x.value.arguments size == 0);
		assert: (x.value.keywords size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testContinue

	| x |
	x := self statementsAt: 22.
	self 
		assert: (x isKindOf: ForAst);
		assert: (x.target isKindOf: NameAst);
		assert: (x.target.assoc.key == #'_');
		assert: (x.target.ctx isKindOf: StoreAst);
		assert: (x.iter isKindOf: NameAst);
		assert: (x.iter.assoc.key == #'x');
		assert: (x.iter.ctx isKindOf: LoadAst);
		assert: (x.body.body size = 1);
		assert: ((x.body.body at: 1) isKindOf: ContinueAst);
		assert: (x.orelse size = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelMultiple

	| x y |
	x := self statementsAt: 14.
	self 
		assert: (x isKindOf: DeleteAst);
		assert: (x.targets size == 2);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: y.assoc.key == #'x';
		assert: (y.ctx isKindOf: DelAst);
		assert: ((y := x.targets at: 2) isKindOf: NameAst);
		assert: y.assoc.key == #'i';
		assert: (y.ctx isKindOf: DelAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelSingle

	| x y |
	x := self statementsAt: 13.
	self 
		assert: (x isKindOf: DeleteAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: y.assoc.key == #'x';
		assert: (y.ctx isKindOf:DelAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testGlobal

	| x |
	x := self statementsAt: 25.
	self 
		assert: (x isKindOf: GlobalAst);
		assert: (x.names size == 1);
		assert: ((x.names at: 1) = 'g');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testImport

	| x y |
	x := self statementsAt: 23.
	self 
		assert: (x isKindOf: ImportAst);
		assert: (x.names size == 1);
		assert: ((y := x.names at: 1) isKindOf: AliasAst);
		assert: (y.name == #'foo');
		assert: (y.asName isNil);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testImportFrom

	| x y |
	x := self statementsAt: 24.
	self 
		assert: (x isKindOf: ImportFromAst);
		assert: (x.module = 'foo');
		assert: (x.names size == 1);
		assert: ((y := x.names at: 1) isKindOf: AliasAst);
		assert: (y.name == #'attr');
		assert: (y.asName isNil);
		assert: (x.level = 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testIndexAssignment

	| x y |
	x := self statementsAt: 7.
	self 
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.assoc.key == #'i');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: NumAst);
		assert: (x.value.n == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testNonlocal

	| x |
	x := self statementsAt: 26.
	self 
		assert: (x isKindOf: NonlocalAst);
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
		assert: (x isKindOf: ClassDefAst);
		assert: (x.name = 'C');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testPassFunction

	| x y |
	x := self statementsAt: 11.
	self 
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'f');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: ((y := x.args.args at: 1) isKindOf: ArgAst);
		assert: (y.arg == #'arg');
		assert: (y.annotation isNone);
		assert: (x.args.vararg isNone);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNone);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaise

	| x y |
	x := self statementsAt: 19.
	self 
		assert: (x isKindOf: RaiseAst);
		assert: (x.exc isKindOf: CallAst);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.exc.function.assoc.key == #'RuntimeError');
		assert: (x.exc.function.ctx isKindOf: LoadAst);
		assert: (x.exc.arguments size == 1);
		assert: ((y := x.exc.arguments at: 1) isKindOf: StrAst);
		assert: (y.s = 'Something bad happened');
		assert: (x.exc.keywords size == 0);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.cause isNone);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaiseFromNone

	| x y |
	x := self statementsAt: 20.
	self 
		assert: (x isKindOf: RaiseAst);
		assert: (x.exc isKindOf: CallAst);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.exc.function.assoc.key == #'RuntimeError');
		assert: (x.exc.function.ctx isKindOf: LoadAst);
		assert: (x.exc.arguments size == 1);
		assert: ((y := x.exc.arguments at: 1) isKindOf: StrAst);
		assert: (y.s = 'Something bad happened');
		assert: (x.exc.keywords size == 0);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.cause isKindOf: NoneAst);
		assert: (x.cause isNone);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnNone

	| x y |
	x := self statementsAt: 15.
	self 
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'a');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNone);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNone);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: ReturnAst);
		assert: (y.value isNone);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnTrue

	| x y |
	x := self statementsAt: 16.
	self 
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'b');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNone);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNone);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: ReturnAst);
		assert: (y.value isKindOf: TrueAst);
		assert: (y.value evaluate);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testSwapAssignment

	| x y |
	x := self statementsAt: 8.
	self 
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: TupleAst);
		assert: ((y := y.elts at: 1) isKindOf: NameAst);
		assert: (y.assoc.key == #'i');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (y := x.targets at: 1) notNil;
		assert: ((y := y.elts at: 2) isKindOf: SubscriptAst);
		assert: (y.value isKindOf: NameAst);
		assert: (y.value.assoc.key == #'x');
		assert: (y.value.ctx isKindOf: LoadAst);
		assert: (y.ctx isKindOf: StoreAst);
		assert: (y := x.targets at: 1) notNil;
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: TupleAst);
		assert: (x.value.elts size == 2);
		assert: ((y := x.value.elts at: 1) isKindOf: NumAst);
		assert: (y.n == 1);
		assert: ((y := x.value.elts at: 2) isKindOf: NumAst);
		assert: (y.n == 2);
		assert: (x.value.ctx isKindOf: LoadAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYield

	| x y |
	x := self statementsAt: 17.
	self 
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'gen');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNone);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNone);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: ExprAst);
		assert: (y.value isKindOf: YieldAst);
		assert: (y.value.value isKindOf: NumAst);
		assert: (y.value.value.n == 123);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYieldAsync

	| x y |
	x := self statementsAt: 18.
	self 
		assert: (x isKindOf: AsyncFunctionDefAst);
		assert: (x.name = 'agen');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg isNone);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg isNone);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: ExprAst);
		assert: (y.value isKindOf:YieldAst);
		assert: (y.value.value isKindOf: NumAst);
		assert: (y.value.value.n == 123);
		assert: (x.decorator_list size == 0);
		assert: (x.returns isNone);
		yourself.
%
