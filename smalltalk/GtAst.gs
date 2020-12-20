! ------------------- Remove existing behavior from GtAst
removeAllMethods GtAst
removeAllClassMethods GtAst
! ------------------- Class methods for GtAst
! ------------------- Instance methods for GtAst
set compile_env: 0
category: 'other'
method: GtAst
left: lhs right: rhs

	^ lhs __gt__ value: lhs value: rhs
%
