! ------------------- Remove existing behavior from BitAndAst
expectvalue /Metaclass3       
doit
BitAndAst removeAllMethods.
BitAndAst class removeAllMethods.
%
! ------------------- Class methods for BitAndAst
! ------------------- Instance methods for BitAndAst
set compile_env: 0
category: 'other'
method: BitAndAst
left: leftOperand right: rightOperand

	^ leftOperand __and__ value: rightOperand
%
