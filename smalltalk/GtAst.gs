! ------------------- Remove existing behavior from GtAst
expectvalue /Metaclass3       
doit
GtAst removeAllMethods.
GtAst class removeAllMethods.
%
! ------------------- Class methods for GtAst
! ------------------- Instance methods for GtAst
set compile_env: 0
category: 'other'
method: GtAst
left: lhs right: rhs

	^ lhs __gt__ value: lhs value: rhs
%
