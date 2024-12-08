! ------------------- Remove existing behavior from BinOpAst
removeallmethods BinOpAst
removeallclassmethods BinOpAst
! ------------------- Class methods for BinOpAst
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
messagePrecedence

	^3
%
category: 'other'
method: BinOpAst
printSmalltalkOn: aStream

	self smalltalkSourceFor: left parenthesisIf: 3 on: aStream.
	op printSmalltalkOn: aStream.
	self smalltalkSourceFor: right parenthesisIf: 2 on: aStream.
%
