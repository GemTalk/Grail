! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ListCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'ListCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ListCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.ListComp

A list comprehension.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''[x for x in numbers]'', mode=''eval''), indent=4))
Expression(
    body=ListComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        ListCompAst(elt generators)
'
%

expectvalue /Class
doit
ListCompAst category: 'Parser'
%

! ------------------- Remove existing behavior from ListCompAst
removeallmethods ListCompAst
removeallclassmethods ListCompAst
set compile_env: 0
! ------------------- Class methods for ListCompAst
! ------------------- Instance methods for ListCompAst
