! ------------------- Remove existing behavior from ListAst
removeallmethods ListAst
removeallclassmethods ListAst
set compile_env: 0
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

	self halt.
%
