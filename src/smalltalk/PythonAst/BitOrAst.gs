! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BitOrAst
expectvalue /Class
doit
OperatorAst subclass: 'BitOrAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BitOrAst comment:
'https://docs.python.org/3/library/ast.html#ast.BitOr

Binary operator token for bitwise OR (|).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        BitOrAst
'
%

expectvalue /Class
doit
BitOrAst category: 'Parser'
%

! ------------------- Remove existing behavior from BitOrAst
removeallmethods BitOrAst
removeallclassmethods BitOrAst

set compile_env: 0

category: 'other'
method: BitOrAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __or__: '.
%
