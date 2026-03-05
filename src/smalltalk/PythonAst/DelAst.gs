! ------------------- Superclass check
run
ExpressionContextAst ifNil: [self error: 'ExpressionContextAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DelAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'DelAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DelAst comment:
'https://docs.python.org/3/library/ast.html#ast.Del

Expression context for deleting a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being deleted.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        DelAst
'
%

expectvalue /Class
doit
DelAst category: 'Parser'
%

! ------------------- Remove existing behavior from DelAst
removeallmethods DelAst
removeallclassmethods DelAst
set compile_env: 0
! ------------------- Class methods for DelAst
! ------------------- Instance methods for DelAst
