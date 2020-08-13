! ------------------- Remove existing behavior from LShiftAst
expectvalue /Metaclass3       
doit
LShiftAst removeAllMethods.
LShiftAst class removeAllMethods.
%
! ------------------- Class methods for LShiftAst
! ------------------- Instance methods for LShiftAst
set compile_env: 0
category: 'other'
method: LShiftAst
left: leftOperand right: rightOperand

	^ leftOperand __lshift__ value: rightOperand
%
