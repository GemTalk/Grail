! ------------------- Remove existing behavior from PyAugAssign
expectvalue /Metaclass3       
doit
PyAugAssign removeAllMethods.
PyAugAssign class removeAllMethods.
%
! ------------------- Class methods for PyAugAssign
! ------------------- Instance methods for PyAugAssign
set compile_env: 0
category: 'other'
method: PyAugAssign
evaluate
	
	| x |
	x := op left: (parent variableAt: target) right: value evaluate.
	parent variableAt: target put: x.
%
category: 'other'
method: PyAugAssign
initialize
	"AugAssign(expr target, operator op, expr value)"

	target := self expression.
	self commaSpace.
	op := PyOperator parent: self.
	self commaSpace.
	value := self expression.
	self readPosition.
%
