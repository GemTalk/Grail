! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExpressionContextAst
expectvalue /Class
doit
AbstractNode subclass: 'ExpressionContextAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ExpressionContextAst comment:
'https://docs.python.org/3/library/ast.html#ast.expr_context

Expression context base class. The context indicates whether the expression is being read (Load), written to (Store), or deleted (Del).

This is an abstract base class. The concrete subclasses are Load, Store, Del, and Param.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
'
%

expectvalue /Class
doit
ExpressionContextAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ExpressionContextAst
removeallmethods ExpressionContextAst
removeallclassmethods ExpressionContextAst

set compile_env: 0

category: 'Grail-other'
classmethod: ExpressionContextAst
isAbstract

	^self == ExpressionContextAst
%

category: 'Grail-other'
method: ExpressionContextAst
assertIsLoad

	self error: 'Expression Context should be <Load> but is <' , self class name , '>'.
%

category: 'Grail-other'
method: ExpressionContextAst
assertIsStore

	self error: 'Expression Context should be <Store> but is <' , self class name , '>'.
%

category: 'Grail-other'
method: ExpressionContextAst
isStoreCtx

	^false
%
