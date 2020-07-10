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
isAbstract

	^self == PyUnaryOp
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
	"unaryop = Invert | Not | UAdd | USub"

	(self stream peekFor: $)) ifFalse: [self error].
	self commaSpace.
	operand := self expression.
	self readPosition.
%
