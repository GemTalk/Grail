! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for IfExpAst
expectvalue /Class
doit
ExpressionAst subclass: 'IfExpAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
IfExpAst comment:
'https://docs.python.org/3/library/ast.html#ast.IfExp

An expression such as a if b else c.

test is the condition.
body is the value if the condition is true.
orelse is the value if the condition is false.

Example:
>>> print(ast.dump(ast.parse(''a if b else c'', mode=''eval''), indent=4))
Expression(
    body=IfExp(
        test=Name(id=''b'', ctx=Load()),
        body=Name(id=''a'', ctx=Load()),
        orelse=Name(id=''c'', ctx=Load())))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        IfExpAst(test body orelse)
'
%

expectvalue /Class
doit
IfExpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from IfExpAst
removeallmethods IfExpAst
removeallclassmethods IfExpAst

set compile_env: 0

category: 'Grail-other'
method: IfExpAst
printSmalltalkOn: aStream
	"Conditional expression ``body if test else orelse''.  The ``test''
	is evaluated for Python truthiness — None / 0 / empty containers /
	empty strings are falsy, everything else is truthy unless a user
	class overrides via __bool__ / __len__.  Smalltalk's
	``ifTrue:ifFalse:'' demands a Boolean, so route ``test'' through
	the universal ``___isTruthy___'' helper (defined on Object) before
	the conditional.  Mirrors what IfAst / WhileAst already emit; see
	TernaryTruthinessTestCase."

	aStream nextPutAll: '(('.
	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ') ___isTruthy___ ifTrue: ['.
	body printSmalltalkOn: aStream.
	aStream nextPutAll: '] ifFalse: ['.
	orelse printSmalltalkOn: aStream.
	aStream nextPutAll: '])'.
%
