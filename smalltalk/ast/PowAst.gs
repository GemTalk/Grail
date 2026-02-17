! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for PowAst
expectvalue /Class
doit
OperatorAst subclass: 'PowAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
PowAst comment:
'https://docs.python.org/3/library/ast.html#ast.Pow

Binary operator token for exponentiation (**).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        PowAst
'
%

expectvalue /Class
doit
PowAst category: 'Parser'
%

! ------------------- Remove existing behavior from PowAst
removeallmethods PowAst
removeallclassmethods PowAst

set compile_env: 0

category: 'other'
method: PowAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __pow__: '.
%
