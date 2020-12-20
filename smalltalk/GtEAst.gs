! ------------------- Remove existing behavior from GtEAst
removeAllMethods GtEAst
removeAllClassMethods GtEAst
! ------------------- Class methods for GtEAst
! ------------------- Instance methods for GtEAst
set compile_env: 0
category: 'other'
method: GtEAst
left: lhs right: rhs

	^ lhs __gte__ value: lhs value: rhs
%
