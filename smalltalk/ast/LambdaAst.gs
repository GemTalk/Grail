! ------------------- Remove existing behavior from LambdaAst
removeallmethods LambdaAst
removeallclassmethods LambdaAst
set compile_env: 0
! ------------------- Class methods for LambdaAst
! ------------------- Instance methods for LambdaAst
category: 'other'
method: LambdaAst
initialize
	"Lambda(arguments args, expr body)"

	args := ArgumentsAst parent: self.
	self commaSpace.
	body := self expression.
	self readPosition.
%
category: 'other'
method: LambdaAst
name

	^'<lambda>'
%
