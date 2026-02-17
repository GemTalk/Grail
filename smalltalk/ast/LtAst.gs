! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for LtAst
expectvalue /Class
doit
CmpOpAst subclass: 'LtAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
LtAst comment:
'https://docs.python.org/3/library/ast.html#ast.Lt

Comparison operator token for less than (<).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        LtAst
'
%

expectvalue /Class
doit
LtAst category: 'Parser'
%

! ------------------- Remove existing behavior from LtAst
removeallmethods LtAst
removeallclassmethods LtAst

set compile_env: 0

category: 'other'
method: LtAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __lt__: '.
%
