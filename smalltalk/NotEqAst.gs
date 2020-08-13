! ------------------- Remove existing behavior from NotEqAst
expectvalue /Metaclass3       
doit
NotEqAst removeAllMethods.
NotEqAst class removeAllMethods.
%
! ------------------- Class methods for NotEqAst
! ------------------- Instance methods for NotEqAst
set compile_env: 0
category: 'other'
method: NotEqAst
left: lhs right: rhs

	^ lhs __ne__ value: lhs value: rhs
%
