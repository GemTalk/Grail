! ------------------- Remove existing behavior from DeleteAst
removeallmethods DeleteAst
removeallclassmethods DeleteAst
set compile_env: 0
! ------------------- Class methods for DeleteAst
! ------------------- Instance methods for DeleteAst
category: 'other'
method: DeleteAst
initialize
	"Delete(expr* targets)"

	targets := self collectAst: [self expression].
	self readPosition.
%
