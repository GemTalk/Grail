! ------------------- Superclass check
run
UnaryOpAst ifNil: [self error: 'UnaryOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for UAddAst
expectvalue /Class
doit
UnaryOpAst subclass: 'UAddAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
UAddAst comment:
'https://docs.python.org/3/library/ast.html#ast.UAdd

Unary operator token for unary positive (+).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        UAddAst
'
%

expectvalue /Class
doit
UAddAst category: 'Parser'
%

! ------------------- Remove existing behavior from UAddAst
removeallmethods UAddAst
removeallclassmethods UAddAst

set compile_env: 0

category: 'other'
method: UAddAst
printSmalltalkOn: aStream

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __pos__'.
%
