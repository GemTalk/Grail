! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonParserTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PythonParserTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PythonParserTestCase category: 'SUnit'
%

! ===============================================================================
! PythonParserTestCase - Tests for PythonParser
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonParserTestCase removeAllMethods.
PythonParserTestCase class removeAllMethods.
%

set compile_env: 0

category: 'helpers'
method: PythonParserTestCase
fieldOf: anObject named: aSymbol
	"Access an instance variable by name using reflection."

	| varNames index |
	varNames := anObject class allInstVarNames.
	index := varNames indexOf: aSymbol.
	index > 0 ifTrue: [^anObject instVarAt: index].
	^nil
%

category: 'helpers'
method: PythonParserTestCase
firstExprValue: aString
	"Parse source and return the value of the first ExprAst statement."

	| stmt |
	stmt := self firstStatement: aString.
	^self fieldOf: stmt named: #value
%

category: 'helpers'
method: PythonParserTestCase
firstStatement: aString
	"Parse source and return the first statement from the module body."

	| module body |
	module := self parse: aString.
	body := module body body.
	^body first
%

category: 'helpers'
method: PythonParserTestCase
parse: aString

	^PythonParser parse: aString
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_addition
	"Parse addition."

	| expr |
	expr := self firstExprValue: '1 + 2'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: AddAst).
	self assert: ((self fieldOf: expr named: #left) isKindOf: ConstantAst).
	self assert: ((self fieldOf: expr named: #right) isKindOf: ConstantAst).
%

category: 'tests - boolean ops'
method: PythonParserTestCase
test_and
	"Parse 'and' expression."

	| expr |
	expr := self firstExprValue: 'x and y'.
	self assert: (expr isKindOf: AndAst).
	self assert: (self fieldOf: expr named: #values) size equals: 2.
%

category: 'tests - assignment'
method: PythonParserTestCase
test_annotated_assignment
	"Parse annotated assignment: x: int = 1."

	| stmt |
	stmt := self firstStatement: 'x: int = 1'.
	self assert: (stmt isKindOf: AnnAssignAst).
	self assert: ((self fieldOf: stmt named: #annotation) isKindOf: NameAst).
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_assert
	"Parse assert statement."

	| stmt |
	stmt := self firstStatement: 'assert x > 0'.
	self assert: (stmt isKindOf: AssertAst).
	self assert: (self fieldOf: stmt named: #test) notNil.
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_assert_with_message
	"Parse assert with message."

	| stmt |
	stmt := self firstStatement: 'assert x > 0, "must be positive"'.
	self assert: (stmt isKindOf: AssertAst).
	self assert: (self fieldOf: stmt named: #msg) notNil.
%

category: 'tests - async'
method: PythonParserTestCase
test_async_function
	"Parse async function definition."

	| stmt |
	stmt := self firstStatement: 'async def foo():
    pass'.
	self assert: (stmt isKindOf: AsyncFunctionDefAst).
%

category: 'tests - attribute'
method: PythonParserTestCase
test_attribute_access
	"Parse attribute access: a.b."

	| expr |
	expr := self firstExprValue: 'a.b'.
	self assert: (expr isKindOf: AttributeAst).
	self assert: (self fieldOf: expr named: #attr) equals: #b.
%

category: 'tests - assignment'
method: PythonParserTestCase
test_augmented_assignment
	"Parse augmented assignment: x += 1."

	| stmt |
	stmt := self firstStatement: 'x += 1'.
	self assert: (stmt isKindOf: AugAssignAst).
	self assert: ((self fieldOf: stmt named: #op) isKindOf: AddAst).
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_bitwise_and
	"Parse bitwise AND."

	| expr |
	expr := self firstExprValue: '1 & 2'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: BitAndAst).
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_bitwise_or
	"Parse bitwise OR."

	| expr |
	expr := self firstExprValue: '1 | 2'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: BitOrAst).
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_bitwise_xor
	"Parse bitwise XOR."

	| expr |
	expr := self firstExprValue: '1 ^ 2'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: BitXorAst).
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_break
	"Parse break statement."

	| stmt |
	stmt := self firstStatement: 'break'.
	self assert: (stmt isKindOf: BreakAst).
%

category: 'tests - calls'
method: PythonParserTestCase
test_call_double_star_kwargs
	"Parse function call with **kwargs: f(**kwargs)."

	| expr kw |
	expr := self firstExprValue: 'f(**kwargs)'.
	self assert: (expr isKindOf: CallAst).
	kw := self fieldOf: expr named: #keywords.
	self assert: kw size equals: 1.
	self assert: (self fieldOf: kw first named: #arg) isNil.
%

category: 'tests - calls'
method: PythonParserTestCase
test_call_keyword_args
	"Parse function call with keyword args: f(x=1, y=2)."

	| expr |
	expr := self firstExprValue: 'f(x=1, y=2)'.
	self assert: (expr isKindOf: CallAst).
	self assert: (self fieldOf: expr named: #keywords) size equals: 2.
%

category: 'tests - calls'
method: PythonParserTestCase
test_call_no_args
	"Parse function call with no args: f()."

	| expr |
	expr := self firstExprValue: 'f()'.
	self assert: (expr isKindOf: CallAst).
	self assert: (self fieldOf: expr named: #arguments) isEmpty.
	self assert: (self fieldOf: expr named: #keywords) isEmpty.
%

category: 'tests - calls'
method: PythonParserTestCase
test_call_positional_args
	"Parse function call with positional args: f(1, 2, 3)."

	| expr |
	expr := self firstExprValue: 'f(1, 2, 3)'.
	self assert: (expr isKindOf: CallAst).
	self assert: (self fieldOf: expr named: #arguments) size equals: 3.
%

category: 'tests - calls'
method: PythonParserTestCase
test_call_star_args
	"Parse function call with *args: f(*args)."

	| expr args |
	expr := self firstExprValue: 'f(*args)'.
	self assert: (expr isKindOf: CallAst).
	args := self fieldOf: expr named: #arguments.
	self assert: args size equals: 1.
	self assert: (args first isKindOf: StarredAst).
%

category: 'tests - boolean ops'
method: PythonParserTestCase
test_chained_and
	"Parse chained 'and': x and y and z."

	| expr |
	expr := self firstExprValue: 'x and y and z'.
	self assert: (expr isKindOf: AndAst).
	self assert: (self fieldOf: expr named: #values) size equals: 3.
%

category: 'tests - boolean ops'
method: PythonParserTestCase
test_chained_or
	"Parse chained 'or': x or y or z."

	| expr |
	expr := self firstExprValue: 'x or y or z'.
	self assert: (expr isKindOf: OrAst).
	self assert: (self fieldOf: expr named: #values) size equals: 3.
%

category: 'tests - assignment'
method: PythonParserTestCase
test_chained_assignment
	"Parse chained assignment: x = y = 1."

	| stmt targets |
	stmt := self firstStatement: 'x = y = 1'.
	self assert: (stmt isKindOf: AssignAst).
	targets := self fieldOf: stmt named: #targets.
	self assert: targets size equals: 2.
%

category: 'tests - attribute'
method: PythonParserTestCase
test_chained_attribute
	"Parse chained attribute: a.b.c."

	| expr inner |
	expr := self firstExprValue: 'a.b.c'.
	self assert: (expr isKindOf: AttributeAst).
	self assert: (self fieldOf: expr named: #attr) equals: #c.
	inner := self fieldOf: expr named: #value.
	self assert: (inner isKindOf: AttributeAst).
	self assert: (self fieldOf: inner named: #attr) equals: #b.
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_chained_comparison
	"Parse chained comparison: 1 < x < 10."

	| expr ops |
	expr := self firstExprValue: '1 < x < 10'.
	self assert: (expr isKindOf: CompareAst).
	ops := self fieldOf: expr named: #cmpopList.
	self assert: ops size equals: 2.
	self assert: (ops first isKindOf: LtAst).
	self assert: (ops last isKindOf: LtAst).
%

category: 'tests - class def'
method: PythonParserTestCase
test_class_with_base
	"Parse class with base class."

	| stmt bases |
	stmt := self firstStatement: 'class Foo(Bar):
    pass'.
	self assert: (stmt isKindOf: ClassDefAst).
	bases := self fieldOf: stmt named: #bases.
	self assert: bases size equals: 1.
%

category: 'tests - class def'
method: PythonParserTestCase
test_class_with_metaclass
	"Parse class with metaclass keyword."

	| stmt keywords |
	stmt := self firstStatement: 'class Foo(metaclass=Meta):
    pass'.
	self assert: (stmt isKindOf: ClassDefAst).
	keywords := self fieldOf: stmt named: #keywords.
	self assert: keywords size equals: 1.
%

category: 'tests - complex'
method: PythonParserTestCase
test_class_with_methods
	"Parse a class with multiple methods."

	| module stmt body |
	module := self parse: 'class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def __str__(self):
        return str(self.x)'.
	stmt := module body body first.
	self assert: (stmt isKindOf: ClassDefAst).
	body := (self fieldOf: stmt named: #body) body.
	self assert: body size equals: 2.
	self assert: (body first isKindOf: InstanceFunctionDefAst).
	self assert: (body last isKindOf: InstanceFunctionDefAst).
%

category: 'tests - class nesting'
method: PythonParserTestCase
test_classmethod_decorator
	"@classmethod produces ClassFunctionDefAst."

	| stmt body method |
	stmt := self firstStatement: 'class Foo:
    @classmethod
    def bar(cls):
        pass'.
	body := (self fieldOf: stmt named: #body) body.
	method := body first.
	self assert: (method isKindOf: ClassFunctionDefAst).
%

category: 'tests - comprehensions'
method: PythonParserTestCase
test_comprehension_with_condition
	"Parse list comprehension with if: [x for x in y if x > 0]."

	| expr gens ifs |
	expr := self firstExprValue: '[x for x in y if x > 0]'.
	self assert: (expr isKindOf: ListCompAst).
	gens := self fieldOf: expr named: #generators.
	ifs := self fieldOf: gens first named: #ifs.
	self assert: ifs size equals: 1.
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_continue
	"Parse continue statement."

	| stmt |
	stmt := self firstStatement: 'continue'.
	self assert: (stmt isKindOf: ContinueAst).
%

category: 'tests - decorators'
method: PythonParserTestCase
test_decorator_with_args
	"Parse function with decorator that takes arguments."

	| stmt decList |
	stmt := self firstStatement: '@mydecorator(arg)
def foo():
    pass'.
	self assert: (stmt isKindOf: FunctionDefAst).
	decList := self fieldOf: stmt named: #decorator_list.
	self assert: decList size equals: 1.
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_delete
	"Parse delete statement."

	| stmt |
	stmt := self firstStatement: 'del x'.
	self assert: (stmt isKindOf: DeleteAst).
%

category: 'tests - comprehensions'
method: PythonParserTestCase
test_dict_comprehension
	"Parse dict comprehension: {k: v for k, v in items}."

	| expr |
	expr := self firstExprValue: '{k: v for k, v in items}'.
	self assert: (expr isKindOf: DictCompAst).
%

category: 'tests - collections'
method: PythonParserTestCase
test_dict_with_entries
	"Parse dict: {'a': 1, 'b': 2}."

	| expr |
	expr := self firstExprValue: '{''a'': 1, ''b'': 2}'.
	self assert: (expr isKindOf: DictAst).
	self assert: (self fieldOf: expr named: #keys) size equals: 2.
	self assert: (self fieldOf: expr named: #values) size equals: 2.
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_division
	"Parse division."

	| expr |
	expr := self firstExprValue: '10 / 3'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: DivAst).
%

category: 'tests - literals'
method: PythonParserTestCase
test_ellipsis_literal
	"Parse ellipsis literal (...)."

	| expr |
	expr := self firstExprValue: '...'.
	self assert: (expr isKindOf: ConstantAst).
%

category: 'tests - collections'
method: PythonParserTestCase
test_empty_dict
	"Parse empty dict: {}."

	| expr |
	expr := self firstExprValue: '{}'.
	self assert: (expr isKindOf: DictAst).
	self assert: (self fieldOf: expr named: #keys) isEmpty.
%

category: 'tests - collections'
method: PythonParserTestCase
test_empty_list
	"Parse empty list: []."

	| expr |
	expr := self firstExprValue: '[]'.
	self assert: (expr isKindOf: ListAst).
	self assert: (self fieldOf: expr named: #elts) isEmpty.
%

category: 'tests - module'
method: PythonParserTestCase
test_empty_module
	"Parsing empty string produces a ModuleAst."

	| module |
	module := self parse: ''.
	self assert: module class equals: ModuleAst.
	self assert: module name equals: '__main__'.
	self assert: module body body isEmpty.
%

category: 'tests - collections'
method: PythonParserTestCase
test_empty_tuple
	"Parse empty tuple: ()."

	| expr |
	expr := self firstExprValue: '()'.
	self assert: (expr isKindOf: TupleAst).
	self assert: (self fieldOf: expr named: #elts) isEmpty.
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_equals
	"Parse equality comparison."

	| expr |
	expr := self firstExprValue: 'x == y'.
	self assert: (expr isKindOf: CompareAst).
	self assert: ((self fieldOf: expr named: #cmpopList) first isKindOf: EqAst).
%

category: 'tests - expr statement'
method: PythonParserTestCase
test_expression_statement
	"Parse expression used as statement."

	| stmt |
	stmt := self firstStatement: 'print("hello")'.
	self assert: (stmt isKindOf: ExprAst).
	self assert: ((self fieldOf: stmt named: #value) isKindOf: CallAst).
%

category: 'tests - literals'
method: PythonParserTestCase
test_false_literal
	"Parse False literal."

	| expr |
	expr := self firstExprValue: 'False'.
	self assert: (expr isKindOf: ConstantAst).
	self assert: (self fieldOf: expr named: #value) equals: false.
%

category: 'tests - complex'
method: PythonParserTestCase
test_fibonacci
	"Parse a fibonacci function."

	| module stmt |
	module := self parse: 'def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)'.
	stmt := module body body first.
	self assert: (stmt isKindOf: FunctionDefAst).
	self assert: stmt name equals: #fib.
%

category: 'tests - literals'
method: PythonParserTestCase
test_float_literal
	"Parse float literal."

	| expr |
	expr := self firstExprValue: '3.14'.
	self assert: (expr isKindOf: ConstantAst).
	self assert: ((self fieldOf: expr named: #value) - 3.14) abs < 0.001.
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_floor_division
	"Parse floor division."

	| expr |
	expr := self firstExprValue: '10 // 3'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: FloorDivAst).
%

category: 'tests - for'
method: PythonParserTestCase
test_for_loop
	"Parse for loop."

	| stmt |
	stmt := self firstStatement: 'for x in y:
    pass'.
	self assert: (stmt isKindOf: ForAst).
	self assert: ((self fieldOf: stmt named: #target) isKindOf: NameAst).
	self assert: ((self fieldOf: stmt named: #iter) isKindOf: NameAst).
%

category: 'tests - for'
method: PythonParserTestCase
test_for_tuple_unpack
	"Parse for with tuple unpacking."

	| stmt target |
	stmt := self firstStatement: 'for x, y in z:
    pass'.
	self assert: (stmt isKindOf: ForAst).
	target := self fieldOf: stmt named: #target.
	self assert: (target isKindOf: TupleAst).
%

category: 'tests - import'
method: PythonParserTestCase
test_from_import
	"Parse from...import statement."

	| stmt |
	stmt := self firstStatement: 'from os import path'.
	self assert: (stmt isKindOf: ImportFromAst).
	self assert: (self fieldOf: stmt named: #module) equals: 'os'.
%

category: 'tests - import'
method: PythonParserTestCase
test_from_import_star
	"Parse from...import * statement."

	| stmt names |
	stmt := self firstStatement: 'from os import *'.
	self assert: (stmt isKindOf: ImportFromAst).
	names := self fieldOf: stmt named: #names.
	self assert: names size equals: 1.
	self assert: names first name equals: #'*'.
%

category: 'tests - function def'
method: PythonParserTestCase
test_function_body_variables
	"Function body has its own variable scope."

	| stmt body |
	stmt := self firstStatement: 'def foo():
    x = 1'.
	body := self fieldOf: stmt named: #body.
	self assert: (body isKindOf: BlockAst).
	self assert: (body variables includes: #x).
%

category: 'tests - function def'
method: PythonParserTestCase
test_function_registers_variable
	"Function def registers function name as variable."

	| module vars |
	module := self parse: 'def foo():
    pass'.
	vars := module body variables.
	self assert: (vars includes: #foo).
%

category: 'tests - function def'
method: PythonParserTestCase
test_function_return_annotation
	"Parse function with return type annotation."

	| stmt |
	stmt := self firstStatement: 'def foo() -> int:
    pass'.
	self assert: (stmt isKindOf: FunctionDefAst).
	self assert: (self fieldOf: stmt named: #returns) notNil.
%

category: 'tests - function def'
method: PythonParserTestCase
test_function_with_args
	"Parse function with arguments."

	| stmt args |
	stmt := self firstStatement: 'def foo(x, y):
    pass'.
	self assert: (stmt isKindOf: FunctionDefAst).
	args := self fieldOf: stmt named: #args.
	self assert: (self fieldOf: args named: #args) size equals: 2.
%

category: 'tests - function def'
method: PythonParserTestCase
test_function_with_defaults
	"Parse function with default arguments."

	| stmt args defaults |
	stmt := self firstStatement: 'def foo(x, y=1):
    pass'.
	args := self fieldOf: stmt named: #args.
	defaults := self fieldOf: args named: #defaults.
	self assert: defaults size equals: 1.
%

category: 'tests - function def'
method: PythonParserTestCase
test_function_with_kwargs
	"Parse function with **kwargs."

	| stmt args kwarg |
	stmt := self firstStatement: 'def foo(**kwargs):
    pass'.
	args := self fieldOf: stmt named: #args.
	kwarg := self fieldOf: args named: #kwarg.
	self assert: kwarg notNil.
%

category: 'tests - function def'
method: PythonParserTestCase
test_function_with_star_args
	"Parse function with *args."

	| stmt args vararg |
	stmt := self firstStatement: 'def foo(*args):
    pass'.
	args := self fieldOf: stmt named: #args.
	vararg := self fieldOf: args named: #vararg.
	self assert: vararg notNil.
%

category: 'tests - comprehensions'
method: PythonParserTestCase
test_generator_expression
	"Parse generator expression: (x for x in y)."

	| expr |
	expr := self firstExprValue: '(x for x in y)'.
	self assert: (expr isKindOf: GeneratorExpAst).
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_global
	"Parse global statement."

	| stmt |
	stmt := self firstStatement: 'global x, y'.
	self assert: (stmt isKindOf: GlobalAst).
	self assert: (self fieldOf: stmt named: #names) size equals: 2.
%

category: 'tests - literals'
method: PythonParserTestCase
test_hex_literal
	"Parse hex integer literal."

	| expr |
	expr := self firstExprValue: '0xFF'.
	self assert: (expr isKindOf: ConstantAst).
	self assert: (self fieldOf: expr named: #value) equals: 255.
%

category: 'tests - if'
method: PythonParserTestCase
test_if_elif_else
	"Parse if/elif/else chain."

	| stmt orelseBody elifStmt |
	stmt := self firstStatement: 'if x:
    pass
elif y:
    pass
else:
    pass'.
	self assert: (stmt isKindOf: IfAst).
	orelseBody := (self fieldOf: stmt named: #orelse) body.
	self assert: orelseBody size equals: 1.
	elifStmt := orelseBody first.
	self assert: (elifStmt isKindOf: IfAst).
%

category: 'tests - if'
method: PythonParserTestCase
test_if_else
	"Parse if/else statement."

	| stmt orelse |
	stmt := self firstStatement: 'if x:
    pass
else:
    pass'.
	self assert: (stmt isKindOf: IfAst).
	orelse := self fieldOf: stmt named: #orelse.
	self assert: (orelse isKindOf: SuiteAst).
	self assert: orelse body notEmpty.
%

category: 'tests - import'
method: PythonParserTestCase
test_import
	"Parse import statement."

	| stmt names |
	stmt := self firstStatement: 'import os'.
	self assert: (stmt isKindOf: ImportAst).
	names := self fieldOf: stmt named: #names.
	self assert: names size equals: 1.
	self assert: names first name equals: #os.
%

category: 'tests - import'
method: PythonParserTestCase
test_import_as
	"Parse import with alias."

	| stmt alias |
	stmt := self firstStatement: 'import os as operating_system'.
	self assert: (stmt isKindOf: ImportAst).
	alias := (self fieldOf: stmt named: #names) first.
	self assert: alias name equals: #os.
	self assert: alias asName equals: #operating_system.
%

category: 'tests - import'
method: PythonParserTestCase
test_import_registers_variable
	"Import registers module name as variable."

	| module vars |
	module := self parse: 'import os'.
	vars := module body variables.
	self assert: (vars includes: #os).
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_in_operator
	"Parse 'in' comparison."

	| expr |
	expr := self firstExprValue: 'x in y'.
	self assert: (expr isKindOf: CompareAst).
	self assert: ((self fieldOf: expr named: #cmpopList) first isKindOf: InAst).
%

category: 'tests - literals'
method: PythonParserTestCase
test_integer_literal
	"Parse integer literal."

	| expr |
	expr := self firstExprValue: '42'.
	self assert: (expr isKindOf: ConstantAst).
	self assert: (self fieldOf: expr named: #value) equals: 42.
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_is_not_operator
	"Parse 'is not' comparison."

	| expr |
	expr := self firstExprValue: 'x is not y'.
	self assert: (expr isKindOf: CompareAst).
	self assert: ((self fieldOf: expr named: #cmpopList) first isKindOf: IsNotAst).
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_is_operator
	"Parse 'is' comparison."

	| expr |
	expr := self firstExprValue: 'x is y'.
	self assert: (expr isKindOf: CompareAst).
	self assert: ((self fieldOf: expr named: #cmpopList) first isKindOf: IsAst).
%

category: 'tests - lambda'
method: PythonParserTestCase
test_lambda_no_args
	"Parse lambda with no arguments."

	| expr |
	expr := self firstExprValue: 'lambda: 42'.
	self assert: (expr isKindOf: LambdaAst).
	self assert: (self fieldOf: (self fieldOf: expr named: #args) named: #args) isEmpty.
%

category: 'tests - lambda'
method: PythonParserTestCase
test_lambda_with_args
	"Parse lambda with arguments."

	| expr args |
	expr := self firstExprValue: 'lambda x, y: x + y'.
	self assert: (expr isKindOf: LambdaAst).
	args := self fieldOf: (self fieldOf: expr named: #args) named: #args.
	self assert: args size equals: 2.
%

category: 'tests - lambda'
method: PythonParserTestCase
test_lambda_with_default
	"Parse lambda with default argument."

	| expr defaults |
	expr := self firstExprValue: 'lambda x, y=1: x + y'.
	self assert: (expr isKindOf: LambdaAst).
	defaults := self fieldOf: (self fieldOf: expr named: #args) named: #defaults.
	self assert: defaults size equals: 1.
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_left_shift
	"Parse left shift."

	| expr |
	expr := self firstExprValue: '1 << 2'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: LShiftAst).
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_less_than
	"Parse less-than comparison."

	| expr |
	expr := self firstExprValue: 'x < y'.
	self assert: (expr isKindOf: CompareAst).
	self assert: ((self fieldOf: expr named: #cmpopList) first isKindOf: LtAst).
%

category: 'tests - comprehensions'
method: PythonParserTestCase
test_list_comprehension
	"Parse list comprehension: [x for x in y]."

	| expr |
	expr := self firstExprValue: '[x for x in y]'.
	self assert: (expr isKindOf: ListCompAst).
%

category: 'tests - collections'
method: PythonParserTestCase
test_list_with_elements
	"Parse list with elements: [1, 2, 3]."

	| expr |
	expr := self firstExprValue: '[1, 2, 3]'.
	self assert: (expr isKindOf: ListAst).
	self assert: (self fieldOf: expr named: #elts) size equals: 3.
%

category: 'tests - class nesting'
method: PythonParserTestCase
test_method_becomes_instance_function
	"Function inside class becomes InstanceFunctionDefAst."

	| stmt body method |
	stmt := self firstStatement: 'class Foo:
    def bar(self):
        pass'.
	body := (self fieldOf: stmt named: #body) body.
	method := body first.
	self assert: (method isKindOf: InstanceFunctionDefAst).
%

category: 'tests - module'
method: PythonParserTestCase
test_module_body_is_block
	"Module body should be a BlockAst."

	| module |
	module := self parse: 'x = 1'.
	self assert: (module body isKindOf: BlockAst).
%

category: 'tests - module'
method: PythonParserTestCase
test_module_source
	"Module retains the source string."

	| module |
	module := self parse: 'x = 1'.
	self assert: module source equals: 'x = 1'.
%

category: 'tests - module'
method: PythonParserTestCase
test_module_variables
	"Module-level assignments should register variables."

	| module vars |
	module := self parse: 'x = 1
y = 2'.
	vars := module body variables.
	self assert: (vars includes: #x).
	self assert: (vars includes: #y).
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_modulo
	"Parse modulo."

	| expr |
	expr := self firstExprValue: '10 % 3'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: ModAst).
%

category: 'tests - multiple statements'
method: PythonParserTestCase
test_multiple_statements
	"Parse multiple statements."

	| module body |
	module := self parse: 'x = 1
y = 2
z = 3'.
	body := module body body.
	self assert: body size equals: 3.
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_multiplication
	"Parse multiplication."

	| expr |
	expr := self firstExprValue: '2 * 3'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: MultAst).
%

category: 'tests - names'
method: PythonParserTestCase
test_name_reference
	"Parse name reference."

	| expr |
	expr := self firstExprValue: 'x'.
	self assert: (expr isKindOf: NameAst).
	self assert: expr id equals: #x.
	self assert: ((self fieldOf: expr named: #ctx) isKindOf: LoadAst).
%

category: 'tests - literals'
method: PythonParserTestCase
test_negative_number
	"Parse negative number (unary minus)."

	| expr |
	expr := self firstExprValue: '-42'.
	self assert: (expr isKindOf: USubAst).
%

category: 'tests - literals'
method: PythonParserTestCase
test_none_literal
	"Parse None literal."

	| expr |
	expr := self firstExprValue: 'None'.
	self assert: (expr isKindOf: ConstantAst).
	self assert: (self fieldOf: expr named: #value) equals: nil.
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_nonlocal
	"Parse nonlocal statement."

	| stmt |
	stmt := self firstStatement: 'nonlocal x'.
	self assert: (stmt isKindOf: NonlocalAst).
	self assert: (self fieldOf: stmt named: #names) size equals: 1.
%

category: 'tests - unary ops'
method: PythonParserTestCase
test_not
	"Parse not operator."

	| expr |
	expr := self firstExprValue: 'not x'.
	self assert: (expr isKindOf: NotAst).
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_not_equals
	"Parse not-equals comparison."

	| expr |
	expr := self firstExprValue: 'x != y'.
	self assert: (expr isKindOf: CompareAst).
	self assert: ((self fieldOf: expr named: #cmpopList) first isKindOf: NotEqAst).
%

category: 'tests - comparisons'
method: PythonParserTestCase
test_not_in_operator
	"Parse 'not in' comparison."

	| expr |
	expr := self firstExprValue: 'x not in y'.
	self assert: (expr isKindOf: CompareAst).
	self assert: ((self fieldOf: expr named: #cmpopList) first isKindOf: NotInAst).
%

category: 'tests - boolean ops'
method: PythonParserTestCase
test_or
	"Parse 'or' expression."

	| expr |
	expr := self firstExprValue: 'x or y'.
	self assert: (expr isKindOf: OrAst).
	self assert: (self fieldOf: expr named: #values) size equals: 2.
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_parenthesized_precedence
	"Parse (1 + 2) * 3."

	| expr left |
	expr := self firstExprValue: '(1 + 2) * 3'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: MultAst).
	left := self fieldOf: expr named: #left.
	self assert: (left isKindOf: BinOpAst).
	self assert: ((self fieldOf: left named: #op) isKindOf: AddAst).
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_pass
	"Parse pass statement."

	| stmt |
	stmt := self firstStatement: 'pass'.
	self assert: (stmt isKindOf: PassAst).
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_power
	"Parse power operator."

	| expr |
	expr := self firstExprValue: '2 ** 3'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: PowAst).
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_precedence
	"Parse expression with precedence: 1 + 2 * 3 should be 1 + (2 * 3)."

	| expr right |
	expr := self firstExprValue: '1 + 2 * 3'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: AddAst).
	right := self fieldOf: expr named: #right.
	self assert: (right isKindOf: BinOpAst).
	self assert: ((self fieldOf: right named: #op) isKindOf: MultAst).
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_raise
	"Parse raise statement."

	| stmt |
	stmt := self firstStatement: 'raise ValueError()'.
	self assert: (stmt isKindOf: RaiseAst).
	self assert: (self fieldOf: stmt named: #exc) notNil.
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_return
	"Parse return statement."

	| stmt |
	stmt := self firstStatement: 'return 42'.
	self assert: (stmt isKindOf: ReturnAst).
	self assert: ((self fieldOf: stmt named: #value) isKindOf: ConstantAst).
%

category: 'tests - simple statements'
method: PythonParserTestCase
test_return_none
	"Parse bare return statement."

	| stmt |
	stmt := self firstStatement: 'return'.
	self assert: (stmt isKindOf: ReturnAst).
	self assert: (self fieldOf: stmt named: #value) isNil.
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_right_shift
	"Parse right shift."

	| expr |
	expr := self firstExprValue: '1 >> 2'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: RShiftAst).
%

category: 'tests - multiple statements'
method: PythonParserTestCase
test_semicolon_separated
	"Parse semicolon-separated statements."

	| module body |
	module := self parse: 'x = 1; y = 2'.
	body := module body body.
	self assert: body size equals: 2.
%

category: 'tests - comprehensions'
method: PythonParserTestCase
test_set_comprehension
	"Parse set comprehension: {x for x in y}."

	| expr |
	expr := self firstExprValue: '{x for x in y}'.
	self assert: (expr isKindOf: SetCompAst).
%

category: 'tests - collections'
method: PythonParserTestCase
test_set_with_elements
	"Parse set: {1, 2, 3}."

	| expr |
	expr := self firstExprValue: '{1, 2, 3}'.
	self assert: (expr isKindOf: SetAst).
	self assert: (self fieldOf: expr named: #elts) size equals: 3.
%

category: 'tests - assignment'
method: PythonParserTestCase
test_simple_assignment
	"Parse simple assignment: x = 1."

	| stmt |
	stmt := self firstStatement: 'x = 1'.
	self assert: (stmt isKindOf: AssignAst).
	self assert: (self fieldOf: stmt named: #targets) size equals: 1.
	self assert: ((self fieldOf: stmt named: #targets) first isKindOf: NameAst).
	self assert: ((self fieldOf: stmt named: #targets) first id) equals: #x.
%

category: 'tests - class def'
method: PythonParserTestCase
test_simple_class
	"Parse simple class definition."

	| stmt |
	stmt := self firstStatement: 'class Foo:
    pass'.
	self assert: (stmt isKindOf: ClassDefAst).
	self assert: (self fieldOf: stmt named: #name) equals: #Foo.
%

category: 'tests - decorators'
method: PythonParserTestCase
test_simple_decorator
	"Parse function with simple decorator."

	| stmt decList |
	stmt := self firstStatement: '@mydecorator
def foo():
    pass'.
	self assert: (stmt isKindOf: FunctionDefAst).
	decList := self fieldOf: stmt named: #decorator_list.
	self assert: decList size equals: 1.
%

category: 'tests - function def'
method: PythonParserTestCase
test_simple_function
	"Parse simple function definition."

	| stmt |
	stmt := self firstStatement: 'def foo():
    pass'.
	self assert: (stmt isKindOf: FunctionDefAst).
	self assert: stmt name equals: #foo.
%

category: 'tests - if'
method: PythonParserTestCase
test_simple_if
	"Parse simple if statement."

	| stmt |
	stmt := self firstStatement: 'if x:
    pass'.
	self assert: (stmt isKindOf: IfAst).
	self assert: ((self fieldOf: stmt named: #test) isKindOf: NameAst).
%

category: 'tests - collections'
method: PythonParserTestCase
test_single_element_tuple
	"Parse single-element tuple: (1,)."

	| expr |
	expr := self firstExprValue: '(1,)'.
	self assert: (expr isKindOf: TupleAst).
	self assert: (self fieldOf: expr named: #elts) size equals: 1.
%

category: 'tests - single-line'
method: PythonParserTestCase
test_single_line_def
	"Parse single-line def: def f(): return 1."

	| stmt |
	stmt := self firstStatement: 'def f(): return 1'.
	self assert: (stmt isKindOf: FunctionDefAst).
%

category: 'tests - single-line'
method: PythonParserTestCase
test_single_line_for
	"Parse single-line for: for x in y: pass."

	| stmt |
	stmt := self firstStatement: 'for x in y: pass'.
	self assert: (stmt isKindOf: ForAst).
%

category: 'tests - single-line'
method: PythonParserTestCase
test_single_line_if
	"Parse single-line if: if x: pass."

	| stmt |
	stmt := self firstStatement: 'if x: pass'.
	self assert: (stmt isKindOf: IfAst).
%

category: 'tests - subscript'
method: PythonParserTestCase
test_slice
	"Parse slice: a[1:2]."

	| expr slice |
	expr := self firstExprValue: 'a[1:2]'.
	self assert: (expr isKindOf: SubscriptAst).
	slice := self fieldOf: expr named: #slice.
	self assert: (slice isKindOf: SliceAst).
	self assert: (self fieldOf: slice named: #lower) notNil.
	self assert: (self fieldOf: slice named: #upper) notNil.
	self assert: (self fieldOf: slice named: #step) isNil.
%

category: 'tests - subscript'
method: PythonParserTestCase
test_slice_open_ended
	"Parse open-ended slice: a[:]."

	| expr slice |
	expr := self firstExprValue: 'a[:]'.
	self assert: (expr isKindOf: SubscriptAst).
	slice := self fieldOf: expr named: #slice.
	self assert: (slice isKindOf: SliceAst).
	self assert: (self fieldOf: slice named: #lower) isNil.
	self assert: (self fieldOf: slice named: #upper) isNil.
%

category: 'tests - subscript'
method: PythonParserTestCase
test_slice_with_step
	"Parse slice with step: a[1:10:2]."

	| expr slice |
	expr := self firstExprValue: 'a[1:10:2]'.
	self assert: (expr isKindOf: SubscriptAst).
	slice := self fieldOf: expr named: #slice.
	self assert: (slice isKindOf: SliceAst).
	self assert: (self fieldOf: slice named: #step) notNil.
%

category: 'tests - starred'
method: PythonParserTestCase
test_starred_assignment
	"Parse starred assignment target: *a, b = [1, 2, 3]."

	| stmt target elts |
	stmt := self firstStatement: '*a, b = [1, 2, 3]'.
	self assert: (stmt isKindOf: AssignAst).
	target := (self fieldOf: stmt named: #targets) first.
	self assert: (target isKindOf: TupleAst).
	elts := self fieldOf: target named: #elts.
	self assert: (elts first isKindOf: StarredAst).
%

category: 'tests - class nesting'
method: PythonParserTestCase
test_staticmethod_decorator
	"@staticmethod produces StaticFunctionDefAst."

	| stmt body method |
	stmt := self firstStatement: 'class Foo:
    @staticmethod
    def bar():
        pass'.
	body := (self fieldOf: stmt named: #body) body.
	method := body first.
	self assert: (method isKindOf: StaticFunctionDefAst).
%

category: 'tests - literals'
method: PythonParserTestCase
test_string_literal
	"Parse string literal."

	| expr |
	expr := self firstExprValue: '''hello'''.
	self assert: (expr isKindOf: ConstantAst).
	self assert: (self fieldOf: expr named: #value) equals: 'hello'.
%

category: 'tests - subscript'
method: PythonParserTestCase
test_subscript
	"Parse subscript: a[0]."

	| expr |
	expr := self firstExprValue: 'a[0]'.
	self assert: (expr isKindOf: SubscriptAst).
%

category: 'tests - binary ops'
method: PythonParserTestCase
test_subtraction
	"Parse subtraction."

	| expr |
	expr := self firstExprValue: '3 - 1'.
	self assert: (expr isKindOf: BinOpAst).
	self assert: ((self fieldOf: expr named: #op) isKindOf: SubAst).
%

category: 'tests - ternary'
method: PythonParserTestCase
test_ternary
	"Parse ternary expression: a if b else c."

	| expr |
	expr := self firstExprValue: 'x if True else y'.
	self assert: (expr isKindOf: IfExpAst).
	self assert: ((self fieldOf: expr named: #test) isKindOf: ConstantAst).
%

category: 'tests - class nesting'
method: PythonParserTestCase
test_top_level_function_stays_functiondef
	"Top-level function stays FunctionDefAst (not InstanceFunctionDefAst)."

	| stmt |
	stmt := self firstStatement: 'def foo():
    pass'.
	self assert: stmt class equals: FunctionDefAst.
%

category: 'tests - literals'
method: PythonParserTestCase
test_true_literal
	"Parse True literal."

	| expr |
	expr := self firstExprValue: 'True'.
	self assert: (expr isKindOf: ConstantAst).
	self assert: (self fieldOf: expr named: #value) equals: true.
%

category: 'tests - try'
method: PythonParserTestCase
test_try_except
	"Parse try/except."

	| stmt handlers |
	stmt := self firstStatement: 'try:
    pass
except:
    pass'.
	self assert: (stmt isKindOf: TryAst).
	handlers := self fieldOf: stmt named: #handlers.
	self assert: handlers size equals: 1.
%

category: 'tests - try'
method: PythonParserTestCase
test_try_except_as
	"Parse try/except with as-binding."

	| stmt handlers handler |
	stmt := self firstStatement: 'try:
    pass
except ValueError as e:
    pass'.
	handlers := self fieldOf: stmt named: #handlers.
	handler := handlers first.
	self assert: (self fieldOf: handler named: #name) equals: #e.
%

category: 'tests - try'
method: PythonParserTestCase
test_try_except_typed
	"Parse try/except with type."

	| stmt handlers handler |
	stmt := self firstStatement: 'try:
    pass
except ValueError:
    pass'.
	handlers := self fieldOf: stmt named: #handlers.
	handler := handlers first.
	self assert: (self fieldOf: handler named: #type) notNil.
%

category: 'tests - try'
method: PythonParserTestCase
test_try_finally
	"Parse try/finally."

	| stmt finalbody |
	stmt := self firstStatement: 'try:
    pass
finally:
    pass'.
	self assert: (stmt isKindOf: TryAst).
	finalbody := self fieldOf: stmt named: #finalbody.
	self assert: (finalbody isKindOf: SuiteAst).
	self assert: finalbody body notEmpty.
%

category: 'tests - assignment'
method: PythonParserTestCase
test_tuple_unpacking
	"Parse tuple unpacking: x, y = 1, 2."

	| stmt target |
	stmt := self firstStatement: 'x, y = 1, 2'.
	self assert: (stmt isKindOf: AssignAst).
	target := (self fieldOf: stmt named: #targets) first.
	self assert: (target isKindOf: TupleAst).
%

category: 'tests - collections'
method: PythonParserTestCase
test_tuple_with_elements
	"Parse tuple: (1, 2, 3)."

	| expr |
	expr := self firstExprValue: '(1, 2, 3)'.
	self assert: (expr isKindOf: TupleAst).
	self assert: (self fieldOf: expr named: #elts) size equals: 3.
%

category: 'tests - unary ops'
method: PythonParserTestCase
test_unary_invert
	"Parse bitwise invert."

	| expr |
	expr := self firstExprValue: '~x'.
	self assert: (expr isKindOf: InvertAst).
%

category: 'tests - unary ops'
method: PythonParserTestCase
test_unary_minus
	"Parse unary minus."

	| expr |
	expr := self firstExprValue: '-x'.
	self assert: (expr isKindOf: USubAst).
%

category: 'tests - unary ops'
method: PythonParserTestCase
test_unary_plus
	"Parse unary plus."

	| expr |
	expr := self firstExprValue: '+x'.
	self assert: (expr isKindOf: UAddAst).
%

category: 'tests - while'
method: PythonParserTestCase
test_while_else
	"Parse while/else."

	| stmt orelse |
	stmt := self firstStatement: 'while x:
    pass
else:
    pass'.
	self assert: (stmt isKindOf: WhileAst).
	orelse := self fieldOf: stmt named: #orelse.
	self assert: (orelse isKindOf: SuiteAst).
%

category: 'tests - while'
method: PythonParserTestCase
test_while_loop
	"Parse while loop."

	| stmt |
	stmt := self firstStatement: 'while True:
    pass'.
	self assert: (stmt isKindOf: WhileAst).
	self assert: ((self fieldOf: stmt named: #test) isKindOf: ConstantAst).
%

category: 'tests - walrus'
method: PythonParserTestCase
test_walrus_in_expression
	"Parse walrus operator inside parenthesized expression: (x := 5)."

	| expr |
	expr := self firstExprValue: '(x := 5)'.
	self assert: (expr isKindOf: NamedExprAst).
	self assert: ((self fieldOf: expr named: #target) isKindOf: NameAst).
	self assert: ((self fieldOf: expr named: #value) isKindOf: ConstantAst).
%

category: 'tests - with'
method: PythonParserTestCase
test_with_multiple
	"Parse with statement with multiple items."

	| stmt items |
	stmt := self firstStatement: 'with a as x, b as y:
    pass'.
	self assert: (stmt isKindOf: WithAst).
	items := self fieldOf: stmt named: #items.
	self assert: items size equals: 2.
%

category: 'tests - with'
method: PythonParserTestCase
test_with_statement
	"Parse with statement."

	| stmt items |
	stmt := self firstStatement: 'with open("f") as fp:
    pass'.
	self assert: (stmt isKindOf: WithAst).
	items := self fieldOf: stmt named: #items.
	self assert: items size equals: 1.
	self assert: (self fieldOf: items first named: #optional_vars) notNil.
%
