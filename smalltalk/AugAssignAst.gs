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
children

	^super children
		add: target;
		add: op;
		add: value;
		yourself
%
category: 'other'
method: AugAssignAst
evaluate
	
	| x |
	x := op left: (parent variableAt: target) right: value evaluate.
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
