! ------------------- Remove existing behavior from YieldAst
removeallmethods YieldAst
removeallclassmethods YieldAst
! ------------------- Class methods for YieldAst
! ------------------- Instance methods for YieldAst
category: 'other'
method: YieldAst
initialize
	"Yield(expr? value)"

	value := self optionalExpression.
	self readPosition.
%
