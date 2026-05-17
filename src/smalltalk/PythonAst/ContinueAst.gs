! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ContinueAst
expectvalue /Class
doit
StatementAst subclass: 'ContinueAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ContinueAst comment:
'https://docs.python.org/3/library/ast.html#ast.Continue

A continue statement.

Example:
>>> print(ast.dump(ast.parse(''continue''), indent=4))
Module(
    body=[Continue()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        ContinueAst
'
%

expectvalue /Class
doit
ContinueAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ContinueAst
removeallmethods ContinueAst
removeallclassmethods ContinueAst
set compile_env: 0
! ------------------- Class methods for ContinueAst
! ------------------- Instance methods for ContinueAst
