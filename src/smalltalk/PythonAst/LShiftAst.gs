! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for LShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'LShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
LShiftAst comment:
'https://docs.python.org/3/library/ast.html#ast.LShift

Binary operator token for left bit shift (<<).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        LShiftAst
'
%

expectvalue /Class
doit
LShiftAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from LShiftAst
removeallmethods LShiftAst
removeallclassmethods LShiftAst

set compile_env: 0

category: 'Grail-other'
method: LShiftAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __lshift__: '.
%
