! ------------------- Remove existing behavior from AssignAst
expectvalue /Metaclass3       
doit
AssignAst removeAllMethods.
AssignAst class removeAllMethods.
%
! ------------------- Class methods for AssignAst
! ------------------- Instance methods for AssignAst
set compile_env: 0
category: 'other'
method: AssignAst
children

	^super children
		addAll: targets;
		add: value;
		yourself
%
category: 'other'
method: AssignAst
evaluate

	| x |
	x := value evaluate.
	targets do: [:each | each assign: x].
	^x
%
category: 'other'
method: AssignAst
initialize
	"Assign(expr* targets, expr value)"

	targets := self collectAst: [self expression].
	self commaSpace.
	value := self expression.
	self readPosition.
%
