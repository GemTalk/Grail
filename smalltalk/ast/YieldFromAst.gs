! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for YieldFromAst
expectvalue /Class
doit
ExpressionAst subclass: 'YieldFromAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
YieldFromAst comment:
'https://docs.python.org/3/library/ast.html#ast.YieldFrom

A yield from expression.

value is what is yielded from.

Example:
>>> print(ast.dump(ast.parse(''yield from x'', mode=''eval''), indent=4))
Expression(
    body=YieldFrom(value=Name(id=''x'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        YieldFromAst(value)
'
%

expectvalue /Class
doit
YieldFromAst category: 'Parser'
%

! ------------------- Remove existing behavior from YieldFromAst
removeallmethods YieldFromAst
removeallclassmethods YieldFromAst
set compile_env: 0
! ------------------- Class methods for YieldFromAst
! ------------------- Instance methods for YieldFromAst
