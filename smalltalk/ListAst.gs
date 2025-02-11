! ------------------- Remove existing behavior from ListAst
removeallmethods ListAst
removeallclassmethods ListAst
! ------------------- Class methods for ListAst
! ------------------- Instance methods for ListAst
category: 'other'
method: ListAst
initialize
	"list(expr* elts, expr_context ctx)"
	
	elts := self collectAst: [self expression].
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: ListAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'list ___value: { '.
	elts do: [:each |
		each printSmalltalkWithParenthesisOn: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPut: $}.
%
