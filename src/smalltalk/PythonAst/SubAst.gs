! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubAst
expectvalue /Class
doit
OperatorAst subclass: 'SubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SubAst comment:
'https://docs.python.org/3/library/ast.html#ast.Sub

Binary operator token for subtraction (-).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        SubAst
'
%

expectvalue /Class
doit
SubAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from SubAst
removeallmethods SubAst
removeallclassmethods SubAst

set compile_env: 0

category: 'Grail-other'
method: SubAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __sub__: '.
%
