! ------------------- Remove existing behavior from YieldFromAst
removeallmethods YieldFromAst
removeallclassmethods YieldFromAst
set compile_env: 0
! ------------------- Class methods for YieldFromAst
! ------------------- Instance methods for YieldFromAst
category: 'other'
method: YieldFromAst
initialize
	"YieldFrom(expr value)"

	value := self expression.
	self readPosition.
%
