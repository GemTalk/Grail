! ------------------- Remove existing behavior from PyUnaryOp
expectvalue /Metaclass3       
doit
PyUnaryOp removeAllMethods.
PyUnaryOp class removeAllMethods.
%
! ------------------- Class methods for PyUnaryOp
set compile_env: 0
category: 'other'
classmethod: PyUnaryOp
parent: aNode
	"unaryop = Invert | Not | UAdd | USub"

	self == PyUnaryOp ifTrue: [
		^self customChildForParent: aNode peekForCloseParenthesis: true.
	] ifFalse: [
		^super parent: aNode
	].
%
! ------------------- Instance methods for PyUnaryOp
set compile_env: 0
category: 'other'
method: PyUnaryOp
_operand
	^ operand
%
category: 'other'
method: PyUnaryOp
evaluate

	self subclassResponsibility.
%
category: 'other'
method: PyUnaryOp
initialize
	"UnaryOp(unaryop op, expr operand)"

	self commaSpace.
	operand := self expression.
	self readPosition.
%
