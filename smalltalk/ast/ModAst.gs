! ------------------- Superclass check
run
OperatorAst ifNil: [self error: 'OperatorAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModAst
expectvalue /Class
doit
OperatorAst subclass: 'ModAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ModAst comment:
'https://docs.python.org/3/library/ast.html#ast.Mod

Binary operator token for modulo (%).

Used as the op field in BinOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      OperatorAst
        ModAst
'
%

expectvalue /Class
doit
ModAst category: 'Parser'
%

! ------------------- Remove existing behavior from ModAst
removeallmethods ModAst
removeallclassmethods ModAst

set compile_env: 0

category: 'other'
method: ModAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __mod__: '.
%
