! ------------------- Superclass check
run
CmpOpAst ifNil: [self error: 'CmpOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for EqAst
expectvalue /Class
doit
CmpOpAst subclass: 'EqAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
EqAst comment:
'https://docs.python.org/3/library/ast.html#ast.Eq

Comparison operator token for equality (==).

Used in the ops list of Compare nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      CmpOpAst
        EqAst
'
%

expectvalue /Class
doit
EqAst category: 'Parser'
%

! ------------------- Remove existing behavior from EqAst
removeallmethods EqAst
removeallclassmethods EqAst

set compile_env: 0

category: 'other'
method: EqAst
printSmalltalkOn: aStream

	aStream nextPutAll: ' __eq__: '.
%
