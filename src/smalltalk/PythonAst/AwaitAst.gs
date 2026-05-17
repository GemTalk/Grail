! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AwaitAst
expectvalue /Class
doit
ExpressionAst subclass: 'AwaitAst'
  instVarNames: #( value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AwaitAst comment:
'https://docs.python.org/3/library/ast.html#ast.Await

An await expression.

value is what it waits for.
Only valid in the body of an AsyncFunctionDef.

Example:
>>> print(ast.dump(ast.parse("""
... async def f():
...     await other_func()
... """), indent=4))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        AwaitAst(value)
'
%

expectvalue /Class
doit
AwaitAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AwaitAst
removeallmethods AwaitAst
removeallclassmethods AwaitAst
set compile_env: 0
! ------------------- Class methods for AwaitAst
! ------------------- Instance methods for AwaitAst
