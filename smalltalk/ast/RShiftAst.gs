! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for RShiftAst
expectvalue /Class
doit
OperatorAst subclass: 'RShiftAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
RShiftAst comment:
'https://docs.python.org/3/library/ast.html#ast.RShift

Binary operator token for right bit shift (>>).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        RShiftAst
'
%

expectvalue /Class
doit
RShiftAst category: 'Parser'
%

! ------------------- Remove existing behavior from RShiftAst
removeallmethods RShiftAst
removeallclassmethods RShiftAst

set compile_env: 0

category: 'other'
method: RShiftAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __rshift__: '.
%
