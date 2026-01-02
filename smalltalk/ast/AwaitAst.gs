! ------------------- Remove existing behavior from AwaitAst
removeallmethods AwaitAst
removeallclassmethods AwaitAst
set compile_env: 0
! ------------------- Class methods for AwaitAst
! ------------------- Instance methods for AwaitAst
category: 'other'
method: AwaitAst
initialize
	"Await(expr value)"

	value := self expression.
	self readPosition.
%
