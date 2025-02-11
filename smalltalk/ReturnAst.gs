! ------------------- Remove existing behavior from ReturnAst
removeallmethods ReturnAst
removeallclassmethods ReturnAst
! ------------------- Class methods for ReturnAst
! ------------------- Instance methods for ReturnAst
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
category: 'other'
method: ReturnAst
printSmalltalkOn: aStream

	value printSmalltalkOn: aStream.
%
