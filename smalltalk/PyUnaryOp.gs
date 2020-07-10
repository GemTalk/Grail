! ------------------- Remove existing behavior from PyUnaryOp
expectvalue /Metaclass3       
doit
PyUnaryOp removeAllMethods.
PyUnaryOp class removeAllMethods.
%
! ------------------- Class methods for PyUnaryOp
! ------------------- Instance methods for PyUnaryOp
set compile_env: 0
category: 'other'
method: PyUnaryOp
_op
	^ op
%
category: 'other'
method: PyUnaryOp
_operand
	^ operand
%
category: 'other'
method: PyUnaryOp
evaluate
	^ op operand: operand.
%
category: 'other'
method: PyUnaryOp
initialize
	"UnaryOp(unaryop op, expr operand)"

	op := PyUnaryop parent: self.
	self commaSpace.
	operand := self expression.
	self readPosition.
%
