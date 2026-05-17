! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for PassAst
expectvalue /Class
doit
StatementAst subclass: 'PassAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
PassAst comment:
'https://docs.python.org/3/library/ast.html#ast.Pass

A pass statement.

Example:
>>> print(ast.dump(ast.parse(''pass''), indent=4))
Module(
    body=[Pass()])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        PassAst
'
%

expectvalue /Class
doit
PassAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from PassAst
removeallmethods PassAst
removeallclassmethods PassAst

set compile_env: 0

category: 'Grail-other'
method: PassAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'nil.'.
%
