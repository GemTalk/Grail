! ------------------- Remove existing behavior from BinOpAst
removeallmethods BinOpAst
removeallclassmethods BinOpAst
set compile_env: 0
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
