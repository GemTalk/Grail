! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for DivAst
expectvalue /Class
doit
OperatorAst subclass: 'DivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
DivAst comment:
'https://docs.python.org/3/library/ast.html#ast.Div

Binary operator token for division (/).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        DivAst
'
%

expectvalue /Class
doit
DivAst category: 'Parser'
%

! ------------------- Remove existing behavior from DivAst
removeallmethods DivAst
removeallclassmethods DivAst

set compile_env: 0

category: 'other'
method: DivAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __truediv__: '.
%
