! ------------------- Remove existing behavior from PyBinOp
expectvalue /Metaclass3       
doit
PyBinOp removeAllMethods.
PyBinOp class removeAllMethods.
%
! ------------------- Class methods for PyBinOp
! ------------------- Instance methods for PyBinOp
set compile_env: 0
category: 'other'
method: PyBinOp
_left
	^ left
%
category: 'other'
method: PyBinOp
_op
	^ op
%
category: 'other'
method: PyBinOp
_right
	^ right
%
category: 'other'
method: PyBinOp
assertContextIsLoad

	self halt
%
category: 'other'
method: PyBinOp
children

	^super children
		add: left;
		add: op;
		add: right;
		yourself
%
category: 'other'
method: PyBinOp
evaluate
	^op left: left evaluate right: right evaluate
%
category: 'other'
method: PyBinOp
initialize
	"BinOp(expr left, operator op, expr right)"
	"If BinOp were the only use of operator, then we would replace it with a subclass of operator.
		But see also AugAssign()."

	left := self expression.
	self commaSpace.
	op := PyOperator parent: self.
	self commaSpace.
	right := self expression.
	self readPosition.
%
