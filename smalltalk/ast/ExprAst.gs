! ------------------- Remove existing behavior from ExprAst
removeallmethods ExprAst
removeallclassmethods ExprAst
! ------------------- Class methods for ExprAst
! ------------------- Instance methods for ExprAst
category: 'other'
method: ExprAst
initialize
	"Expr(expr value)"

	value := self expression.
	self readPosition.
%
category: 'other'
method: ExprAst
messagePrecendence

	
	^3
%
category: 'other'
method: ExprAst
printSmalltalkOn: aStream

%
