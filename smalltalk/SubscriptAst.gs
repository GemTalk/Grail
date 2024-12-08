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
	slice := SliceAbstractAst parent: self.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: SubscriptAst
printSmalltalkOn: aStream

	self smalltalkSourceFor: value parenthesisIf: 3 on: aStream.

	slice class == ConstantAst ifTrue: [
		aStream nextPutAll: ' __getitem__: '.
		self smalltalkSourceFor: slice parenthesisIf: 3 on: aStream.
	] ifFalse: [
		self smalltalkSourceFor: slice parenthesisIf: 3 on: aStream.
	].

	"self halt."
%
