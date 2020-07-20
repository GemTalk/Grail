! ------------------- Remove existing behavior from LambdaAst
expectvalue /Metaclass3       
doit
LambdaAst removeAllMethods.
LambdaAst class removeAllMethods.
%
! ------------------- Class methods for LambdaAst
! ------------------- Instance methods for LambdaAst
set compile_env: 0
category: 'other'
method: LambdaAst
children

	^super children
		add: args;
		add: body;
		yourself
%
category: 'other'
method: LambdaAst
initialize
	"Lambda(arguments args, expr body)"

	args := ArgumentsAst parent: self.
	self commaSpace.
	body := self expression.
	self readPosition.
%
