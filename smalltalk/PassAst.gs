! ------------------- Remove existing behavior from PassAst
removeAllMethods PassAst
removeAllClassMethods PassAst
! ------------------- Class methods for PassAst
! ------------------- Instance methods for PassAst
set compile_env: 0
category: 'other'
method: PassAst
evaluate: aScope
	"This is a NULL operation"
%
category: 'other'
method: PassAst
initialize
	"pass"

	self readPositionOnly.
%
