! ------------------- Remove existing behavior from ReturnAst
expectvalue /Metaclass3       
doit
ReturnAst removeAllMethods.
ReturnAst class removeAllMethods.
%
! ------------------- Class methods for ReturnAst
! ------------------- Instance methods for ReturnAst
set compile_env: 0
category: 'other'
method: ReturnAst
evaluate: aScope
	"Unlike Smalltalk, Python returns None by default, not the result of the last expression.
	To return something explictly, use the `return` command and give a value."

	| result |
	result := value evaluate: aScope.
	ReturnNotification signal: result
%
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
