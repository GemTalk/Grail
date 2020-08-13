! ------------------- Remove existing behavior from InAst
expectvalue /Metaclass3       
doit
InAst removeAllMethods.
InAst class removeAllMethods.
%
! ------------------- Class methods for InAst
! ------------------- Instance methods for InAst
set compile_env: 0
category: 'other'
method: InAst
left: leftOperand right: rightOperand

	^rightOperand __contains__ value: rightOperand value: leftOperand
%
