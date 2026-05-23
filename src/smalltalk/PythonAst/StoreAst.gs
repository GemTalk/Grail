! ------------------- Superclass check
run
ExpressionContextAst ifNil: [self error: 'ExpressionContextAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for StoreAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'StoreAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
StoreAst comment:
'https://docs.python.org/3/library/ast.html#ast.Store

Expression context for writing/storing a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being assigned to.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        StoreAst
'
%

expectvalue /Class
doit
StoreAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from StoreAst
removeallmethods StoreAst
removeallclassmethods StoreAst

set compile_env: 0

category: 'Grail-other'
method: StoreAst
assertIsStore
	"Overide to avoid error"
%

category: 'Grail-other'
method: StoreAst
isStoreCtx

	^true
%
