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
NotAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from NotAst
removeallmethods NotAst
removeallclassmethods NotAst

set compile_env: 0

category: 'Grail-other'
method: NotAst
printSmalltalkOn: aStream
	"Python ``not x`` coerces x to a Boolean via truthiness rules first,
	then negates.  Emitting `x @env0:not` works for actual Booleans but
	fails for any other type (Integer, String, OrderedCollection, ...)
	because those don't implement `not`.  Funnel through ___isTruthy___
	so the negation works on any operand."

	aStream nextPutAll: '('.
	operand printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___) @env0:not'.
%
