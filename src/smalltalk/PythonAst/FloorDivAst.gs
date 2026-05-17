! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for FloorDivAst
expectvalue /Class
doit
OperatorAst subclass: 'FloorDivAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
FloorDivAst comment:
'https://docs.python.org/3/library/ast.html#ast.FloorDiv

Binary operator token for floor division (//).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        FloorDivAst
'
%

expectvalue /Class
doit
FloorDivAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from FloorDivAst
removeallmethods FloorDivAst
removeallclassmethods FloorDivAst

set compile_env: 0

category: 'Grail-other'
method: FloorDivAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __floordiv__: '.
%
