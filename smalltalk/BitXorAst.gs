! ------------------- Remove existing behavior from BitXorAst
expectvalue /Metaclass3       
doit
BitXorAst removeAllMethods.
BitXorAst class removeAllMethods.
%
! ------------------- Class methods for BitXorAst
! ------------------- Instance methods for BitXorAst
set compile_env: 0
category: 'other'
method: BitXorAst
left: leftOperand right: rightOperand

	^ leftOperand __xor__ value: rightOperand
%
