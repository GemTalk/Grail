! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for StatementAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'StatementAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
StatementAst comment:
'https://docs.python.org/3/library/ast.html#ast.stmt

Statement base class.

This is an abstract base class for all statement nodes in the Python AST. Statements are nodes that can appear in the body of a module, function, class, or control structure.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
'
%

expectvalue /Class
doit
StatementAst category: 'Parser'
%

! ------------------- Remove existing behavior from StatementAst
removeallmethods StatementAst
removeallclassmethods StatementAst

set compile_env: 0

category: 'other'
method: StatementAst
addVariableNamesTo: aStream
%
