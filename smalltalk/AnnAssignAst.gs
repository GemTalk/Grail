! ------------------- Remove existing behavior from AnnAssignAst
removeallmethods AnnAssignAst
removeallclassmethods AnnAssignAst
! ------------------- Class methods for AnnAssignAst
! ------------------- Instance methods for AnnAssignAst
category: 'other'
method: AnnAssignAst
initialize
	"AnnAssign(expr target, expr annotation, expr? value, int simple)"

	| stream | 
	stream := self stream.
	target := self expression.
	self commaSpace.
	annotation := self expression. 
	self commaSpace.
	value := self optionalExpression.
	self commaSpace.
	simple := (stream upTo: $,) asNumber.
	stream skip: -1.
	self readPosition.
%
