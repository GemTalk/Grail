! ------------------- Remove existing behavior from SimpleStatementsTestCase
removeallmethods SimpleStatementsTestCase
removeallclassmethods SimpleStatementsTestCase
! ------------------- Class methods for SimpleStatementsTestCase
! ------------------- Instance methods for SimpleStatementsTestCase
category: 'other'
method: SimpleStatementsTestCase
testArrayAssignment

	| pyString ast x y |
	pyString := 'x = [0, 1]'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf:AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.id == #'x');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: ListAst);
		assert: (x.value.elts size == 2);
		assert: ((y := x.value.elts at: 1) isKindOf: ConstantAst);
		assert: (y.value = 'int ___value: 0');
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: (y.value = 'int ___value: 1');
		assert: (x.value.ctx isKindOf: LoadAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignMultiple

	| pyString ast x y |
	pyString := 'var2 = var3 = 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: AssignAst);
		assert: (x.value isKindOf: ConstantAst);
		assert: (x.value.value = 'int ___value: 2');
		assert: (x.targets size == 2);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.id == #'var2');
		assert: (y.ctx isKindOf: StoreAst);
		assert: ((y := x.targets at: 2) isKindOf: NameAst);
		assert: (y.id == #'var3');
		assert: (y.ctx isKindOf: StoreAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testAssignSingle

	| pyString ast x y |
	pyString := 'var1 = 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: AssignAst);
		assert: (x.value isKindOf: ConstantAst);
		assert: (x.value.value = 'int ___value: 1');
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.id == #'var1');
		assert: (y.ctx isKindOf: StoreAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testBreak

	| pyString ast x |
	pyString := 'for _ in x:
    break'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ForAst);
		assert: (x.target isKindOf: NameAst);
		assert: (x.target.id == #'_');
		assert: (x.target.ctx isKindOf: StoreAst);
		assert: (x.iter isKindOf: NameAst);
		assert: (x.iter.id == #'x');
		assert: (x.iter.ctx isKindOf: LoadAst);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: BreakAst);
		assert: (x.orelse.body size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassAttributeAssignment

	| pyString ast x y |
	pyString := 'class Cls:
    x = 3
inst = Cls()
inst.x = inst.x + 1'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 3.
	self
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: AttributeAst);
		assert: (y.value isKindOf: NameAst);
		assert: y.value.id == #'inst';
		assert: (y.value.ctx isKindOf: LoadAst);
		assert: (y.attr == #'x');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: BinOpAst);
		assert: (x.value.left isKindOf: AttributeAst);
		assert: (x.value.left.value isKindOf: NameAst);
		assert: (x.value.left.value.id == #'inst');
		assert: (x.value.left.value.ctx isKindOf: LoadAst);
		assert: (x.value.left.attr == #'x');
		assert: (x.value.left.ctx isKindOf: LoadAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassDefCls

	| pyString ast x y z |
	pyString := 'class Cls:
    x = 3'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ClassDefAst);
		assert: (x.name == #'Cls');
		assert: (x.bases size == 0);
		assert: (x.keywords size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: AssignAst);
		assert: (y.targets size == 1);
		assert: ((z := y.targets at: 1) isKindOf: NameAst);
		assert: (z.id == #'x');
		assert: (z.ctx isKindOf: StoreAst);
		assert: (y.value isKindOf: ConstantAst);
		assert: (y.value.value = 'int ___value: 3');
		assert: (x.decorator_list size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testClassInstantiation

	| pyString ast x y |
	pyString := 'class Cls:
    x = 3
inst = Cls()'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 2.
	self
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.id == #'inst');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: CallAst);
		assert: (x.value.function isKindOf: NameAst);
		assert: (x.value.function.id == #'Cls');
		assert: (x.value.function.ctx isKindOf: LoadAst);
		assert: (x.value.arguments size == 0);
		assert: (x.value.keywords size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testContinue

	| pyString ast x |
	pyString := 'for _ in x:
    continue'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ForAst);
		assert: (x.target isKindOf: NameAst);
		assert: (x.target.id == #'_');
		assert: (x.target.ctx isKindOf: StoreAst);
		assert: (x.iter isKindOf: NameAst);
		assert: (x.iter.id == #'x');
		assert: (x.iter.ctx isKindOf: LoadAst);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: ContinueAst);
		assert: (x.orelse size == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelMultiple

	| pyString ast x y |
	pyString := 'del x, i'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: DeleteAst);
		assert: (x.targets size == 2);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: y.id == #'x';
		assert: (y.ctx isKindOf: DelAst);
		assert: ((y := x.targets at: 2) isKindOf: NameAst);
		assert: y.id == #'i';
		assert: (y.ctx isKindOf: DelAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testDelSingle

	| pyString ast x y |
	pyString := 'del x'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: DeleteAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: y.id == #'x';
		assert: (y.ctx isKindOf:DelAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testGlobal

	| pyString ast x |
	pyString := 'global g'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: GlobalAst);
		assert: (x.names size == 1);
		assert: ((x.names at: 1) == #'g');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testImport

	| pyString ast x y |
	pyString := 'import foo'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
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

	| pyString ast x y |
	pyString := 'from foo import attr'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ImportFromAst);
		assert: (x.module = 'foo');
		assert: (x.names size == 1);
		assert: ((y := x.names at: 1) isKindOf: AliasAst);
		assert: (y.name == #'attr');
		assert: (y.asName isNil);
		assert: (x.level == 0);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testIndexAssignment

	| pyString ast x y |
	pyString := 'i = 0'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: NameAst);
		assert: (y.id == #'i');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: ConstantAst);
		assert: (x.value.value = 'int ___value: 0');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testNonlocal

	| pyString ast x |
	pyString := 'nonlocal x'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: NonlocalAst);
		assert: (x.names size == 1);
		assert: ((x.names at: 1) == #'x');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testPassClass

	| pyString ast x |
	pyString := 'class C: pass'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: ClassDefAst);
		assert: (x.name == #'C');
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

	| pyString ast x y |
	pyString := 'def f(arg): pass'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'f');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: ((y := x.args.args at: 1) isKindOf: ArgAst);
		assert: (y.arg = 'arg');
		assert: (y.annotation == None);
		assert: (x.args.vararg == None);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg = None);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((x.body.body at: 1) isKindOf: PassAst);
		assert: (x.decorator_list size == 0);
		assert: (x.returns == None);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaise

	| pyString ast x y |
	pyString := 'raise RuntimeError("Something bad happened")'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: RaiseAst);
		assert: (x.exc isKindOf: CallAst);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.exc.function.id == #'RuntimeError');
		assert: (x.exc.function.ctx isKindOf: LoadAst);
		assert: (x.exc.arguments size == 1);
		assert: ((y := x.exc.arguments at: 1) isKindOf: ConstantAst);
		assert: (y.value = 'str ___value: ''Something bad happened''');
		assert: (x.exc.keywords size == 0);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.cause == None);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testRaiseFromNone

	| pyString ast x y |
	pyString := 'raise RuntimeError("Something bad happened") from None'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: RaiseAst);
		assert: (x.exc isKindOf: CallAst);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.exc.function.id == #'RuntimeError');
		assert: (x.exc.function.ctx isKindOf: LoadAst);
		assert: (x.exc.arguments size == 1);
		assert: ((y := x.exc.arguments at: 1) isKindOf: ConstantAst);
		assert: (y.value = 'str ___value: ''Something bad happened''');
		assert: (x.exc.keywords size == 0);
		assert: (x.exc.function isKindOf: NameAst);
		assert: (x.cause isKindOf: ConstantAst);
		assert: (x.cause.value = 'None');
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testReturnNone

	| pyString ast x y |
	pyString := 'def a():
    return'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'a');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg == None);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg == None);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: ReturnAst);
		assert: (y.value = None);
		assert: (x.decorator_list size == 0);
		assert: (x.returns == None);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testSwapAssignment

	| pyString ast x y |
	pyString := 'i, x[i] = 1, 2'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: AssignAst);
		assert: (x.targets size == 1);
		assert: ((y := x.targets at: 1) isKindOf: TupleAst);
		assert: ((y := y.elts at: 1) isKindOf: NameAst);
		assert: (y.id == #'i');
		assert: (y.ctx isKindOf: StoreAst);
		assert: (y := x.targets at: 1) notNil;
		assert: ((y := y.elts at: 2) isKindOf: SubscriptAst);
		assert: (y.value isKindOf: NameAst);
		assert: (y.value.id == #'x');
		assert: (y.value.ctx isKindOf: LoadAst);
		assert: (y.ctx isKindOf: StoreAst);
		assert: (y := x.targets at: 1) notNil;
		assert: (y.ctx isKindOf: StoreAst);
		assert: (x.value isKindOf: TupleAst);
		assert: (x.value.elts size == 2);
		assert: ((y := x.value.elts at: 1) isKindOf: ConstantAst);
		assert: (y.value = 'int ___value: 1');
		assert: ((y := x.value.elts at: 2) isKindOf: ConstantAst);
		assert: (y.value = 'int ___value: 2');
		assert: (x.value.ctx isKindOf: LoadAst);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYield

	| pyString ast x y |
	pyString := 'def gen():
    yield 123'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: FunctionDefAst);
		assert: (x.name == #'gen');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg == None);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg == None);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: ExprAst);
		assert: (y.value isKindOf: YieldAst);
		assert: (y.value.value isKindOf: ConstantAst);
		assert: (y.value.value.value = 'int ___value: 123');
		assert: (x.decorator_list size == 0);
		assert: (x.returns == None);
		yourself.
%
category: 'other'
method: SimpleStatementsTestCase
testYieldAsync

	| pyString ast x y |
	pyString := 'async def agen():
    yield 123'.
	ast := ModuleAst astForSource: pyString.
	x := ast.body.body at: 1.
	self
		assert: (x isKindOf: AsyncFunctionDefAst);
		assert: (x.name = 'agen');
		assert: (x.args isKindOf: ArgumentsAst);
		assert: (x.args.args size == 0);
		assert: (x.args.vararg == None);
		assert: (x.args.kwonlyargs size == 0);
		assert: (x.args.kw_defaults size == 0);
		assert: (x.args.kwarg == None);
		assert: (x.args.defaults size == 0);
		assert: (x.body.body size == 1);
		assert: ((y := x.body.body at: 1) isKindOf: ExprAst);
		assert: (y.value isKindOf:YieldAst);
		assert: (y.value.value isKindOf: ConstantAst);
		assert: (y.value.value.value = 'int ___value: 123');
		assert: (x.decorator_list size == 0);
		assert: (x.returns == None);
		yourself.
%
