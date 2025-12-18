! ------------------- Remove existing behavior from SubscriptAst
removeallmethods SubscriptAst
removeallclassmethods SubscriptAst
! ------------------- Class methods for SubscriptAst
! ------------------- Instance methods for SubscriptAst
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
initialize
	"Subscript(expr value, slice slice, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	slice := self expression.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: SubscriptAst
printSmalltalkOn: aStream

	"Always use __getitem__: - SliceAst generates a slice object"
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __getitem__: '.
	slice printSmalltalkWithParenthesisOn: aStream.
%
