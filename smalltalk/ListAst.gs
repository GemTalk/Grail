! ------------------- Remove existing behavior from ListAst
removeAllMethods ListAst
removeAllClassMethods ListAst
! ------------------- Class methods for ListAst
! ------------------- Instance methods for ListAst
set compile_env: 0
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
messagePrecedence
	
	^3
%
category: 'other'
method: ListAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'list ___value: { '.
	elts do: [ :elt |
		self smalltalkSourceFor: elt parenthesisIf: 1 on: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPut: $}.
%
