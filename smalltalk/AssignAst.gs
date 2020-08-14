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
evaluate: aScope

	| x |
	x := value evaluate: aScope.
	targets do: [:each | each setTo: x scope: aScope].
	^x
%
category: 'other'
method: AssignAst
initialize
	"Assign(expr* targets, expr value, string? type_comment)"

	targets := self collectAst: [self expression].
	self commaSpace.
	value := self expression.
	self commaSpace.
	type_comment := self optionalString.
	self readPosition.
%
