! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for MultAst
expectvalue /Class
doit
OperatorAst subclass: 'MultAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
MultAst comment:
'https://docs.python.org/3/library/ast.html#ast.Mult

Binary operator token for multiplication (*).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        MultAst
'
%

expectvalue /Class
doit
MultAst category: 'Parser'
%

! ------------------- Remove existing behavior from MultAst
removeallmethods MultAst
removeallclassmethods MultAst

set compile_env: 0

category: 'other'
method: MultAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __mul__: '.
%
