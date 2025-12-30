! ------------------- Remove existing behavior from BinOpAst
removeallmethods BinOpAst
removeallclassmethods BinOpAst
! ------------------- Class methods for BinOpAst
category: 'other'
classmethod: BinOpAst
left: newLeft operand: operand right: newRight

	^self basicNew 
		initializeLeft: newLeft
		operand: operand
		right: newRight.
%
! ------------------- Instance methods for BinOpAst
category: 'other'
method: BinOpAst
initialize
	"BinOp(expr left, operator op, expr right)"
	"If BinOp were the only use of operator, then we would replace it with a subclass of operator.
		But see also AugAssign()."

	left := self expression.
	self commaSpace.
	op := OperatorAst parent: self.
	self commaSpace.
	right := self expression.
	self readPosition.
%
category: 'other'
method: BinOpAst
initializeLeft: newLeft operand: operand right: newRight

	left := newLeft.
	op := operand.
	right := newRight.
%
category: 'other'
method: BinOpAst
printSmalltalkOn: aStream

	left printSmalltalkWithParenthesisOn: aStream.
	op printSmalltalkOn: aStream.
	right printSmalltalkWithParenthesisOn: aStream.
%
