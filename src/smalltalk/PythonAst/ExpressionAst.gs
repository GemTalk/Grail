! ------------------- Superclass check
run
AbstractLocationNode ifNil: [self error: 'AbstractLocationNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExpressionAst
expectvalue /Class
doit
AbstractLocationNode subclass: 'ExpressionAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ExpressionAst comment:
'https://docs.python.org/3/library/ast.html#ast.expr

Base class for all expression nodes in the AST.

Expressions are nodes that can be evaluated to produce a value.
All expression nodes inherit from this class.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
'
%

expectvalue /Class
doit
ExpressionAst category: 'Parser'
%

! ------------------- Remove existing behavior from ExpressionAst
removeallmethods ExpressionAst
removeallclassmethods ExpressionAst

set compile_env: 0

category: 'other'
classmethod: ExpressionAst
isAbstract

	^self == ExpressionAst
%
