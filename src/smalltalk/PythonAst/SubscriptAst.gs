! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for SubscriptAst
expectvalue /Class
doit
ExpressionAst subclass: 'SubscriptAst'
  instVarNames: #( value slice ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SubscriptAst comment:
'https://docs.python.org/3/library/ast.html#ast.Subscript

A subscript, such as l[1].

value is the subscripted object (usually sequence or mapping).
slice is an index, slice or key. It can be a Tuple and contain a Slice.
ctx is Load for subscript lookup, Store for subscript assignment, Del for subscript deletion.

Example:
>>> print(ast.dump(ast.parse(''l[1:2, 3]'', mode=''eval''), indent=4))
Expression(
    body=Subscript(
        value=Name(id=''l'', ctx=Load()),
        slice=Tuple(elts=[Slice(lower=Constant(value=1), upper=Constant(value=2)), Constant(value=3)], ctx=Load()),
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SubscriptAst(value slice ctx)'
%

expectvalue /Class
doit
SubscriptAst category: 'Parser'
%

! ------------------- Remove existing behavior from SubscriptAst
removeallmethods SubscriptAst
removeallclassmethods SubscriptAst

set compile_env: 0

category: 'accessing'
method: SubscriptAst
slice

	^slice
%

category: 'accessing'
method: SubscriptAst
value

	^value
%

category: 'other'
method: SubscriptAst
assertContextIsLoad

	ctx assertIsLoad.
%

category: 'other'
method: SubscriptAst
assertContextIsStore

	ctx assertIsStore.
%

category: 'other'
method: SubscriptAst
declareVariable

	value declareVariable.
%

category: 'other'
method: SubscriptAst
printSmalltalkOn: aStream

	self assertContextIsLoad.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __getitem__: '.
	slice printSmalltalkWithParenthesisOn: aStream.
%
