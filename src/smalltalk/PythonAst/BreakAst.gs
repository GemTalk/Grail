! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BreakAst
expectvalue /Class
doit
StatementAst subclass: 'BreakAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BreakAst comment:
'https://docs.python.org/3/library/ast.html#ast.Break

A break statement.

Example:
>>> print(ast.dump(ast.parse(''break''), indent=4))
Module(
    body=[Break()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        BreakAst
'
%

expectvalue /Class
doit
BreakAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from BreakAst
removeallmethods BreakAst
removeallclassmethods BreakAst
set compile_env: 0

category: 'code generation'
method: BreakAst
printSmalltalkOn: aStream
	"Signal PythonBreak; the enclosing ForAst (or WhileAst) wraps the
	whileTrue loop in an `@env0:on: PythonBreak do: [:ex | nil]`
	handler, so the signal cleanly exits the innermost loop."

	aStream nextPutAll: 'PythonBreak @env0:___signal___.'
%
