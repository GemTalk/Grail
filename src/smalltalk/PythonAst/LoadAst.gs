! ------------------- Superclass check
run
ExpressionContextAst ifNil: [self error: 'ExpressionContextAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for LoadAst
expectvalue /Class
doit
ExpressionContextAst subclass: 'LoadAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
LoadAst comment:
'https://docs.python.org/3/library/ast.html#ast.Load

Expression context for reading/loading a value.

Used as the ctx field in Name, Attribute, Subscript, List, and Tuple nodes when the expression is being read.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionContextAst
        LoadAst
'
%

expectvalue /Class
doit
LoadAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from LoadAst
removeallmethods LoadAst
removeallclassmethods LoadAst

set compile_env: 0

category: 'Grail-other'
method: LoadAst
assertIsLoad
	"Override to avoid inherited error"
%
