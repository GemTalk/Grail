! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NotEqAst
expectvalue /Class
doit
CmpOpAst subclass: 'NotEqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NotEqAst comment:
'https://docs.python.org/3/library/ast.html#ast.NotEq

Comparison operator token for inequality (!=).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        NotEqAst
'
%

expectvalue /Class
doit
NotEqAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NotEqAst
removeallmethods NotEqAst
removeallclassmethods NotEqAst

set compile_env: 0

category: 'Grail-other'
method: NotEqAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __ne__: '.
%
