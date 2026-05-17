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
SubscriptAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from SubscriptAst
removeallmethods SubscriptAst
removeallclassmethods SubscriptAst

set compile_env: 0

category: 'Grail-accessing'
method: SubscriptAst
slice

	^slice
%

category: 'Grail-accessing'
method: SubscriptAst
value

	^value
%

category: 'Grail-other'
method: SubscriptAst
assertContextIsLoad

	ctx assertIsLoad.
%

category: 'Grail-other'
method: SubscriptAst
assertContextIsStore

	ctx assertIsStore.
%

category: 'Grail-other'
method: SubscriptAst
declareVariable

	value declareVariable.
%

category: 'Grail-other'
method: SubscriptAst
printSmalltalkOn: aStream
	"Plain index (`xs[i]`)  →  `(xs) __getitem__: (i)`.
	Slice    (`xs[i:j:k]`) →  `(xs) __getslice__: lo _: hi _: st`,
	emitting `nil` for each omitted bound (the runtime side normalizes).
	`xs[i, j]` (tuple subscript) falls through to plain __getitem__ —
	dict-style multi-key access; sequence slicing with steppy tuples is
	out of scope until something needs it."

	self assertContextIsLoad.
	(slice isKindOf: SliceAst) ifTrue: [
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: ' __getslice__: '.
		(slice lower) ifNil: [aStream nextPutAll: 'nil']
			ifNotNil: [slice lower printSmalltalkWithParenthesisOn: aStream].
		aStream nextPutAll: ' _: '.
		(slice upper) ifNil: [aStream nextPutAll: 'nil']
			ifNotNil: [slice upper printSmalltalkWithParenthesisOn: aStream].
		aStream nextPutAll: ' _: '.
		(slice step) ifNil: [aStream nextPutAll: 'nil']
			ifNotNil: [slice step printSmalltalkWithParenthesisOn: aStream].
		^self
	].
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __getitem__: '.
	slice printSmalltalkWithParenthesisOn: aStream.
%
