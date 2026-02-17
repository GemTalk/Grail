! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for GtEAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtEAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
GtEAst comment:
'https://docs.python.org/3/library/ast.html#ast.GtE

Comparison operator token for greater than or equal (>=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        GtEAst
'
%

expectvalue /Class
doit
GtEAst category: 'Parser'
%

! ------------------- Remove existing behavior from GtEAst
removeallmethods GtEAst
removeallclassmethods GtEAst

set compile_env: 0

category: 'other'
method: GtEAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __ge__: '.
%
