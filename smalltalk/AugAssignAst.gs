! ------------------- Remove existing behavior from AugAssignAst
removeAllMethods AugAssignAst
removeAllClassMethods AugAssignAst
! ------------------- Class methods for AugAssignAst
! ------------------- Instance methods for AugAssignAst
set compile_env: 0
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
