! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for GlobalAst
expectvalue /Class
doit
StatementAst subclass: 'GlobalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
GlobalAst comment:
'https://docs.python.org/3/library/ast.html#ast.Global

A global statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse(''global x, y''), indent=4))
Module(
    body=[
        Global(names=[''x'', ''y''])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        GlobalAst(names)
'
%

expectvalue /Class
doit
GlobalAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from GlobalAst
removeallmethods GlobalAst
removeallclassmethods GlobalAst

set compile_env: 0

category: 'Grail-other'
method: GlobalAst
printSmalltalkOn: aStream
	"Python ``global x'' is a declaration, not a statement that
	produces runtime code — it tells the parser that assignments to
	``x'' inside the function update the module global rather than
	create a local.

	The semantics are realised entirely at parse time (PythonParser >>
	parseGlobal + popScope): each declared name is stripped from the
	enclosing function's local variable / write sets and registered in
	the module scope, so NameAst codegen resolves its reads and writes
	through the module instance's dynamicInstVarAt: storage.  The
	declaration statement itself therefore emits nothing."

	"Emit nothing — the statement is a parse-time declaration only."
%
