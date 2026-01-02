! ------------------- Remove existing behavior from ExprAst
removeallmethods ExprAst
removeallclassmethods ExprAst
set compile_env: 0
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

	value printSmalltalkOn: aStream.
%
