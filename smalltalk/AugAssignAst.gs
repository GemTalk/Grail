! ------------------- Remove existing behavior from AugAssignAst
expectvalue /Metaclass3       
doit
AugAssignAst removeAllMethods.
AugAssignAst class removeAllMethods.
%
! ------------------- Class methods for AugAssignAst
! ------------------- Instance methods for AugAssignAst
set compile_env: 0
category: 'other'
method: AugAssignAst
evaluate: aScope
	
	| x |
self halt.
	x := op left: (parent variableAt: target) right: value evaluate: aScope.
	parent variableAt: target put: x.
%
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
