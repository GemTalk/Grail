! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BitXorAst
expectvalue /Class
doit
OperatorAst subclass: 'BitXorAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BitXorAst comment:
'https://docs.python.org/3/library/ast.html#ast.BitXor

Binary operator token for bitwise XOR (^).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitXorAst
'
%

expectvalue /Class
doit
BitXorAst category: 'Parser'
%

! ------------------- Remove existing behavior from BitXorAst
removeallmethods BitXorAst
removeallclassmethods BitXorAst

set compile_env: 0

category: 'other'
method: BitXorAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __xor__: '.
%
