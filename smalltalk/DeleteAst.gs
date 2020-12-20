! ------------------- Remove existing behavior from DeleteAst
removeAllMethods DeleteAst
removeAllClassMethods DeleteAst
! ------------------- Class methods for DeleteAst
! ------------------- Instance methods for DeleteAst
set compile_env: 0
category: 'other'
method: DeleteAst
initialize
	"Delete(expr* targets)"

	targets := self collectAst: [self expression].
	self readPosition.
%
