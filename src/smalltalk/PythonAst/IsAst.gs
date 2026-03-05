! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for IsAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
IsAst comment:
'https://docs.python.org/3/library/ast.html#ast.Is

Comparison operator token for identity test (is).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        IsAst
'
%

expectvalue /Class
doit
IsAst category: 'Parser'
%

! ------------------- Remove existing behavior from IsAst
removeallmethods IsAst
removeallclassmethods IsAst

set compile_env: 0

category: 'other'
method: IsAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' == '.
%
