! ------------------- Remove existing behavior from YieldFromAst
removeAllMethods YieldFromAst
removeAllClassMethods YieldFromAst
! ------------------- Class methods for YieldFromAst
! ------------------- Instance methods for YieldFromAst
set compile_env: 0
category: 'other'
method: YieldFromAst
initialize
	"YieldFrom(expr value)"

	value := self expression.
	self readPosition.
%
