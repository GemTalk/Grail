! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for SetCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetCompAst'
  instVarNames: #( elt generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SetCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.SetComp

A set comprehension.

elt is a single node representing the part that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''{x for x in numbers}'', mode=''eval''), indent=4))
Expression(
    body=SetComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SetCompAst(elt generators)
'
%

expectvalue /Class
doit
SetCompAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from SetCompAst
removeallmethods SetCompAst
removeallclassmethods SetCompAst
set compile_env: 0
! ------------------- Class methods for SetCompAst
! ------------------- Instance methods for SetCompAst
