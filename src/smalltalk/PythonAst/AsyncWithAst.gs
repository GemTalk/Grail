! ------------------- Superclass check
run
WithAst ifNil: [self error: 'WithAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AsyncWithAst
! Inherits all fields + the standard ``printSmalltalkOn:`` codegen from
! WithAst.  Grail has no async context managers today, so ``async with``
! is emitted as a regular ``with`` block.  Adequate for the import-only
! Jinja2 / Werkzeug / Flask story.
expectvalue /Class
doit
WithAst subclass: 'AsyncWithAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AsyncWithAst comment:
'https://docs.python.org/3/library/ast.html#ast.AsyncWith

An async with statement.

items is a list of WithItem nodes.
body is a list of nodes.
type_comment is an optional string with the type comment.

Example:
>>> print(ast.dump(ast.parse(''async with x:\\n    ...''), indent=4))
Module(
    body=[
        AsyncWith(
            items=[WithItem(context_expr=Name(id=''x'', ctx=Load()))],
            body=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AsyncWithAst(items body type_comment)
'
%

expectvalue /Class
doit
AsyncWithAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AsyncWithAst
removeallmethods AsyncWithAst
removeallclassmethods AsyncWithAst
set compile_env: 0
! ------------------- Class methods for AsyncWithAst
! ------------------- Instance methods for AsyncWithAst
