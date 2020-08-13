! ------------------- Remove existing behavior from LtAst
expectvalue /Metaclass3       
doit
LtAst removeAllMethods.
LtAst class removeAllMethods.
%
! ------------------- Class methods for LtAst
! ------------------- Instance methods for LtAst
set compile_env: 0
category: 'other'
method: LtAst
left: lhs right: rhs

	^ lhs __lt__ value: lhs value: rhs
%
