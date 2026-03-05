! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for WithItemAst
expectvalue /Class
doit
AbstractNode subclass: 'WithItemAst'
  instVarNames: #( context_expr optional_vars)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
WithItemAst comment:
'https://docs.python.org/3/library/ast.html#ast.withitem

A single context manager in a with statement.

context_expr is the context manager expression.
optional_vars is a Name, Tuple, or other node for the as clause (can be None).

Example:
>>> print(ast.dump(ast.parse(''with x as y:\\n    ...''), indent=4))
Module(
    body=[
        With(
            items=[
                withitem(
                    context_expr=Name(id=''x'', ctx=Load()),
                    optional_vars=Name(id=''y'', ctx=Store()))],
            body=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      WithItemAst(context_expr optional_vars)
'
%

expectvalue /Class
doit
WithItemAst category: 'Parser'
%

! ------------------- Remove existing behavior from WithItemAst
removeallmethods WithItemAst
removeallclassmethods WithItemAst

set compile_env: 0

category: 'Accessing'
method: WithItemAst
context_expr

	^context_expr
%

category: 'Accessing'
method: WithItemAst
optional_vars

	^optional_vars
%
