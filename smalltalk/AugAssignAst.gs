! ------------------- Remove existing behavior from AugAssignAst
removeallmethods AugAssignAst
removeallclassmethods AugAssignAst
! ------------------- Class methods for AugAssignAst
! ------------------- Instance methods for AugAssignAst
category: 'other'
method: AugAssignAst
initialize
	"AugAssign(expr target, operator op, expr value)"

	target := self expression.
	self commaSpace.
	op := OperatorAst parent: self.
	self commaSpace.
	value := self expression.
	self readPosition.
%
category: 'other'
method: AugAssignAst
printSmalltalkOn: aStream

	| var rhs |
	var :=  NameAst with: target id.
	var ctx: LoadAst.
	rhs := BinOpAst left: var operand: op right: value. 
	target printSmalltalkOn: aStream.
	rhs printSmalltalkWithParenthesisOn: aStream.
%
