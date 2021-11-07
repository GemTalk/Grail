! ------------------- Remove existing behavior from AssignAst
removeAllMethods AssignAst
removeAllClassMethods AssignAst
! ------------------- Class methods for AssignAst
! ------------------- Instance methods for AssignAst
set compile_env: 0
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
