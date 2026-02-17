! ------------------- Superclass check
run
UnaryOpAst ifNil: [self error: 'UnaryOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for InvertAst
expectvalue /Class
doit
UnaryOpAst subclass: 'InvertAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
InvertAst comment:
'https://docs.python.org/3/library/ast.html#ast.Invert

Unary operator token for bitwise inversion (~).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        InvertAst
'
%

expectvalue /Class
doit
InvertAst category: 'Parser'
%

! ------------------- Remove existing behavior from InvertAst
removeallmethods InvertAst
removeallclassmethods InvertAst

set compile_env: 0

category: 'other'
method: InvertAst
printSmalltalkOn: aStream

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __invert__'.
%
