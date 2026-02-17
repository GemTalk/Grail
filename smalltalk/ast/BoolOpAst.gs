! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BoolOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BoolOpAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BoolOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.BoolOp

A boolean operation, ''or'' or ''and''.

op is Or or And.
values are the values involved. Consecutive operations with the same
operator, such as a or b or c, are collapsed into one node with several values.

This doesn''t include not, which is a UnaryOp.

Example:
>>> print(ast.dump(ast.parse(''x or y'', mode=''eval''), indent=4))
Expression(
    body=BoolOp(
        op=Or(),
        values=[
            Name(id=''x'', ctx=Load()),
            Name(id=''y'', ctx=Load())]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
'
%

expectvalue /Class
doit
BoolOpAst category: 'Parser'
%

! ------------------- Remove existing behavior from BoolOpAst
removeallmethods BoolOpAst
removeallclassmethods BoolOpAst

set compile_env: 0

category: 'other'
classmethod: BoolOpAst
isAbstract

	^self == BoolOpAst
%
