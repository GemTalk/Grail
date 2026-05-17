! ------------------- Superclass check
run
ExpressionContextAst ifNil: [self error: 'ExpressionContextAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ParamAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'ParamAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ParamAst comment:
'https://docs.python.org/3/library/ast.html#ast.Param

Expression context for function parameters.

Used as the ctx field in Name nodes when the name is a function parameter.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        ParamAst
'
%

expectvalue /Class
doit
ParamAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ParamAst
removeallmethods ParamAst
removeallclassmethods ParamAst
set compile_env: 0
! ------------------- Class methods for ParamAst
! ------------------- Instance methods for ParamAst
