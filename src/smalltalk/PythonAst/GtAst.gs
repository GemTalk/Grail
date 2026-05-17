! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for GtAst
expectvalue /Class
doit
CmpOpAst subclass: 'GtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
GtAst comment:
'https://docs.python.org/3/library/ast.html#ast.Gt

Comparison operator token for greater than (>).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        GtAst
'
%

expectvalue /Class
doit
GtAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from GtAst
removeallmethods GtAst
removeallclassmethods GtAst

set compile_env: 0

category: 'Grail-other'
method: GtAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __gt__: '.
%
