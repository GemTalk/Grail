! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AddAst
expectvalue /Class
doit
OperatorAst subclass: 'AddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AddAst comment:
'https://docs.python.org/3/library/ast.html#ast.Add

Binary operator token for addition (+).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        AddAst
'
%

expectvalue /Class
doit
AddAst category: 'Parser'
%

! ------------------- Remove existing behavior from AddAst
removeallmethods AddAst
removeallclassmethods AddAst

set compile_env: 0

category: 'other'
method: AddAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __add__: '.
%
