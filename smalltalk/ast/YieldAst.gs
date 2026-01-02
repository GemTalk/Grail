! ------------------- Remove existing behavior from YieldAst
removeallmethods YieldAst
removeallclassmethods YieldAst
set compile_env: 0
! ------------------- Class methods for YieldAst
! ------------------- Instance methods for YieldAst
category: 'other'
method: YieldAst
initialize
	"Yield(expr? value)"

	value := self optionalExpression.
	self readPosition.
%
