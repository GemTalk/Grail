! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BitAndAst
expectvalue /Class
doit
OperatorAst subclass: 'BitAndAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BitAndAst comment:
'https://docs.python.org/3/library/ast.html#ast.BitAnd

Binary operator token for bitwise AND (&).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitAndAst
'
%

expectvalue /Class
doit
BitAndAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from BitAndAst
removeallmethods BitAndAst
removeallclassmethods BitAndAst

set compile_env: 0

category: 'Grail-other'
method: BitAndAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __and__: '.
%
