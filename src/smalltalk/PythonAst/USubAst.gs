! ------------------- Superclass check
run
UnaryOpAst ifNil: [self error: 'UnaryOpAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for USubAst
expectvalue /Class
doit
UnaryOpAst subclass: 'USubAst'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
USubAst comment:
'https://docs.python.org/3/library/ast.html#ast.USub

Unary operator token for unary negation (-).

Used as the op field in UnaryOp nodes.

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      UnaryOpAst
        USubAst
'
%

expectvalue /Class
doit
USubAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from USubAst
removeallmethods USubAst
removeallclassmethods USubAst

set compile_env: 0

category: 'Grail-other'
method: USubAst
printSmalltalkOn: aStream

	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __neg__'.
%
