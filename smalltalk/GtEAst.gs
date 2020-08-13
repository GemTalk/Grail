! ------------------- Remove existing behavior from GtEAst
expectvalue /Metaclass3       
doit
GtEAst removeAllMethods.
GtEAst class removeAllMethods.
%
! ------------------- Class methods for GtEAst
! ------------------- Instance methods for GtEAst
set compile_env: 0
category: 'other'
method: GtEAst
left: lhs right: rhs

	^ lhs __gte__ value: lhs value: rhs
%
