! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for IsNotAst
expectvalue /Class
doit
CmpOpAst subclass: 'IsNotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
IsNotAst comment:
'https://docs.python.org/3/library/ast.html#ast.IsNot

Comparison operator token for negative identity test (is not).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        IsNotAst
'
%

expectvalue /Class
doit
IsNotAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from IsNotAst
removeallmethods IsNotAst
removeallclassmethods IsNotAst

set compile_env: 0

category: 'Grail-other'
method: IsNotAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' ~~ '.
%
