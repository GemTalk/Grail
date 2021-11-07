! ------------------- Remove existing behavior from ExprAst
removeAllMethods ExprAst
removeAllClassMethods ExprAst
! ------------------- Class methods for ExprAst
! ------------------- Instance methods for ExprAst
set compile_env: 0
category: 'other'
method: ExprAst
initialize
	"Expr(expr value)"

	value := self expression.
	self readPosition.
%
