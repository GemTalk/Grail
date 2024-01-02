! ------------------- Remove existing behavior from AwaitAst
expectvalue /Metaclass3
doit
AwaitAst removeAllMethods.
AwaitAst class removeAllMethods.
%
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
