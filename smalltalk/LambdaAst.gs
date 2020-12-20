! ------------------- Remove existing behavior from LambdaAst
removeAllMethods LambdaAst
removeAllClassMethods LambdaAst
! ------------------- Class methods for LambdaAst
! ------------------- Instance methods for LambdaAst
set compile_env: 0
category: 'other'
method: LambdaAst
evaluate: aScope

	^ function newForNode: self scope: (aScope innerForNode: self)
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
category: 'other'
method: LambdaAst
name

	^ '<lambda>'
%
category: 'other'
method: LambdaAst
value: arguments value: keywords value: aScope

	args
		arguments: arguments
		keywords: keywords
		scope: aScope.
	^ body evaluate: aScope
%
