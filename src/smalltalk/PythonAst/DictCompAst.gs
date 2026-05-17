! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DictCompAst
expectvalue /Class
doit
ExpressionAst subclass: 'DictCompAst'
  instVarNames: #( key value generators)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DictCompAst comment:
'https://docs.python.org/3/library/ast.html#ast.DictComp

A dictionary comprehension.

key and value are single nodes representing the parts that will be evaluated for each item.
generators is a list of comprehension nodes.

Example:
>>> print(ast.dump(ast.parse(''{x: x**2 for x in numbers}'', mode=''eval''), indent=4))
Expression(
    body=DictComp(
        key=Name(id=''x'', ctx=Load()),
        value=BinOp(left=Name(id=''x'', ctx=Load()), op=Pow(), right=Constant(value=2)),
        generators=[comprehension(...)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        DictCompAst(key value generators)
'
%

expectvalue /Class
doit
DictCompAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from DictCompAst
removeallmethods DictCompAst
removeallclassmethods DictCompAst
set compile_env: 0
! ------------------- Class methods for DictCompAst
! ------------------- Instance methods for DictCompAst
