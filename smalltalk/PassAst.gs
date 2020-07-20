! ------------------- Remove existing behavior from PassAst
expectvalue /Metaclass3       
doit
PassAst removeAllMethods.
PassAst class removeAllMethods.
%
! ------------------- Class methods for PassAst
! ------------------- Instance methods for PassAst
set compile_env: 0
category: 'other'
method: PassAst
evaluate
	"This is a NULL operation"
%
category: 'other'
method: PassAst
initialize
	"pass"

	self readPositionOnly.
%
