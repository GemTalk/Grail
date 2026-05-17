! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NonlocalAst
expectvalue /Class
doit
StatementAst subclass: 'NonlocalAst'
  instVarNames: #( names)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NonlocalAst comment:
'https://docs.python.org/3/library/ast.html#ast.Nonlocal

A nonlocal statement.

names is a list of raw strings.

Example:
>>> print(ast.dump(ast.parse(''nonlocal x, y''), indent=4))
Module(
    body=[
        Nonlocal(names=[''x'', ''y''])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        NonlocalAst(names)
'
%

expectvalue /Class
doit
NonlocalAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NonlocalAst
removeallmethods NonlocalAst
removeallclassmethods NonlocalAst

set compile_env: 0

category: 'Grail-other'
method: NonlocalAst
printSmalltalkOn: aStream

	self halt.
%
