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
GlobalAst category: 'Parser'
%

! ------------------- Remove existing behavior from GlobalAst
removeallmethods GlobalAst
removeallclassmethods GlobalAst

set compile_env: 0

category: 'other'
method: GlobalAst
printSmalltalkOn: aStream

	self halt.
%
