! ------------------- Remove existing behavior from EqAst
removeAllMethods EqAst
removeAllClassMethods EqAst
! ------------------- Class methods for EqAst
! ------------------- Instance methods for EqAst
set compile_env: 0
category: 'other'
method: EqAst
left: lhs right: rhs

	^ lhs __eq__ value: lhs value: rhs
%
