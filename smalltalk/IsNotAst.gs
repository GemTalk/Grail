! ------------------- Remove existing behavior from IsNotAst
expectvalue /Metaclass3       
doit
IsNotAst removeAllMethods.
IsNotAst class removeAllMethods.
%
! ------------------- Class methods for IsNotAst
! ------------------- Instance methods for IsNotAst
set compile_env: 0
category: 'other'
method: IsNotAst
left: leftOperand right: rightOperand

	^(leftOperand == rightOperand) not
%
