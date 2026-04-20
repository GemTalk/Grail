! ------------------- Superclass check
run
UnaryOpAst ifNil: [self error: 'UnaryOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for NotAst
expectvalue /Class
doit
UnaryOpAst subclass: 'NotAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
NotAst comment:
'https://docs.python.org/3/library/ast.html#ast.Not

Unary operator token for logical negation (not).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        NotAst
'
%

expectvalue /Class
doit
NotAst category: 'Parser'
%

! ------------------- Remove existing behavior from NotAst
removeallmethods NotAst
removeallclassmethods NotAst

set compile_env: 0

category: 'other'
method: NotAst
printSmalltalkOn: aStream

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env0:not'.
%
