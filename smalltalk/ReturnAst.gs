! ------------------- Remove existing behavior from ReturnAst
removeAllMethods ReturnAst
removeAllClassMethods ReturnAst
! ------------------- Class methods for ReturnAst
! ------------------- Instance methods for ReturnAst
set compile_env: 0
category: 'other'
method: ReturnAst
initialize
	"Return(expr? value)"
	
	| stream next |
	stream := self stream.
	next := stream peekN: 4.
	value := self optionalExpression.
	self readPosition.
%
