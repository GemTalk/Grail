! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for LtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
LtEAst comment:
'https://docs.python.org/3/library/ast.html#ast.LtE

Comparison operator token for less than or equal (<=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        LtEAst
'
%

expectvalue /Class
doit
LtEAst category: 'Parser'
%

! ------------------- Remove existing behavior from LtEAst
removeallmethods LtEAst
removeallclassmethods LtEAst

set compile_env: 0

category: 'other'
method: LtEAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __le__: '.
%
