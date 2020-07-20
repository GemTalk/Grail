! ------------------- Remove existing behavior from SubAst
expectvalue /Metaclass3       
doit
SubAst removeAllMethods.
SubAst class removeAllMethods.
%
! ------------------- Class methods for SubAst
! ------------------- Instance methods for SubAst
set compile_env: 0
category: 'other'
method: SubAst
left: leftOperand right: rightOperand

	^leftOperand - rightOperand
%
