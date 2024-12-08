! ------------------- Remove existing behavior from YieldFromAst
removeallmethods YieldFromAst
removeallclassmethods YieldFromAst
! ------------------- Class methods for YieldFromAst
! ------------------- Instance methods for YieldFromAst
category: 'other'
method: YieldFromAst
initialize
	"YieldFrom(expr value)"

	value := self expression.
	self readPosition.
%
