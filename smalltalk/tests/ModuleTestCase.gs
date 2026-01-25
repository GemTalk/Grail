! ------------------- Remove existing behavior from ModuleTestCase

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleTestCase removeAllMethods.
ModuleTestCase class removeAllMethods.
%

! ------------------- Class methods for ModuleTestCase
! ------------------- Instance methods for ModuleTestCase

category: 'Setup'
method: ModuleTestCase
setUp

	priorTranscript := Transcript.
%
category: 'Setup'
method: ModuleTestCase
tearDown

	Transcript := priorTranscript.
%
category: 'Source'
method: ModuleTestCase
hello_py

	^'
def say_hello(to, excited):
    trailing_character = ''.''
    if excited:
        trailing_character = ''!''
    print(''Hello '' + to + trailing_character)

to = ''Allen''
say_hello(to, True)
'
%

category: 'AST'
method: ModuleTestCase
hello_ast

	^'Module([
    FunctionDef(''say_hello'', arguments([], [
        arg(''to'', None, None, 2, 14, 2, 16),
        arg(''excited'', None, None, 2, 18, 2, 25),
      ], None, [], [], None, []), [
        Assign([
            Name(''trailing_character'', Store(), 3, 4, 3, 22),
          ], Constant(''.'', None, 3, 25, 3, 28), None, 3, 4, 3, 28),
        If(Name(''excited'', Load(), 4, 7, 4, 14), [
            Assign([
                Name(''trailing_character'', Store(), 5, 8, 5, 26),
              ], Constant(''!'', None, 5, 29, 5, 32), None, 5, 8, 5, 32),
          ], [], 4, 4, 5, 32),
        Expr(Call(Name(''print'', Load(), 6, 4, 6, 9), [
            BinOp(BinOp(Constant(''Hello '', None, 6, 10, 6, 18), Add(), Name(''to'', Load(), 6, 21, 6, 23), 6, 10, 6, 23), Add(), Name(''trailing_character'', Load(), 6, 26, 6, 44), 6, 10, 6, 44),
          ], [], 6, 4, 6, 45), 6, 4, 6, 45),
      ], [], None, None, [], 2, 0, 6, 45),
    Assign([
        Name(''to'', Store(), 8, 0, 8, 2),
      ], Constant(''Allen'', None, 8, 5, 8, 12), None, 8, 0, 8, 12),
    Expr(Call(Name(''say_hello'', Load(), 9, 0, 9, 9), [
        Name(''to'', Load(), 9, 10, 9, 12),
        Constant(True, None, 9, 14, 9, 18),
      ], [], 9, 0, 9, 19), 9, 0, 9, 19),
  ], [])'
%
category: 'AST'
method: ModuleTestCase
x_assign_ast

	^'Module([
    Assign([
        Name(''x'', Store(), 1, 0, 1, 1),
      ], Constant(1, None, 1, 4, 1, 5), None, 1, 0, 1, 5),
  ], [])'
%
category: 'AST'
method: ModuleTestCase
x_increment_ast

	^'Module([
    Assign([
        Name(''x'', Store(), 1, 0, 1, 1),
      ], BinOp(Name(''x'', Load(), 1, 4, 1, 5), Add(), Constant(2, None, 1, 8, 1, 9), 1, 4, 1, 9), None, 1, 0, 1, 9),
  ], [])'
%
category: 'AST'
method: ModuleTestCase
x_expr_ast

	^'Module([
    Expr(Name(''x'', Load(), 1, 0, 1, 1), 1, 0, 1, 1),
  ], [])'
%

category: 'Tests'
method: ModuleTestCase
testCreateAst

	| ast |
	ast := importlib 
		astForAstString: self hello_ast 
		source: self hello_py
		path: nil.
	self assert: ast class == ModuleAst.
%
category: 'Tests'
method: ModuleTestCase
testEvaluateWithPersistentScope
	"Emulate REPL by reusing a scope across evaluations."

	| scope result moduleScope |

	moduleScope := SymbolDictionary new.
	scope := ModuleAst symbolListForModuleScope: moduleScope.
	result := ModuleAst
		evaluateAstString: self x_assign_ast
		source: 'x = 1'
		usingModuleScope: moduleScope.
	self assert: result == None.

	result := ModuleAst
		evaluateAstString: self x_increment_ast
		source: 'x = x + 2'
		usingModuleScope: moduleScope.
	self assert: result == None.

	result := ModuleAst
		evaluateAstString: self x_expr_ast
		source: 'x'
		usingModuleScope: moduleScope.
	self assert: result = 3.
%
category: 'Tests'
method: ModuleTestCase
testReplOutput
	"REPL should print only expression results."

	| scope moduleScope result outputStream |
	importlib pprintast ifNil: [
		"Skip test if pprintast is not configured."
		^ self
	].

	moduleScope := SymbolDictionary new.
	scope := ModuleAst symbolListForModuleScope: moduleScope.

	outputStream := WriteStream on: Unicode7 new.
	Transcript := outputStream.

	result := ModuleAst
		evaluateAstString: self x_assign_ast
		source: 'x = 1'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result ___repr___; nextPut: Character lf.
	].

	result := ModuleAst
		evaluateAstString: self x_increment_ast
		source: 'x = x + 2'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result ___repr___; nextPut: Character lf.
	].

	result := ModuleAst
		evaluateAstString: self x_expr_ast
		source: 'x'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result ___repr___; nextPut: Character lf.
	].

	self assert: outputStream contents equals: '3', (String with: Character lf).
%
