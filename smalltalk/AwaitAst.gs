! ------------------- Remove existing behavior from AwaitAst
removeAllMethods AwaitAst
removeAllClassMethods AwaitAst
! ------------------- Class methods for AwaitAst
! ------------------- Instance methods for AwaitAst
set compile_env: 0
category: 'other'
method: AwaitAst
initialize
	"Await(expr value)"

	value := self expression.
	self readPosition.
%
