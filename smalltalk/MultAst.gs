! ------------------- Remove existing behavior from MultAst
expectvalue /Metaclass3       
doit
MultAst removeAllMethods.
MultAst class removeAllMethods.
%
! ------------------- Class methods for MultAst
! ------------------- Instance methods for MultAst
set compile_env: 0
category: 'other'
method: MultAst
left: leftOperand right: rightOperand

	^leftOperand * rightOperand
%
