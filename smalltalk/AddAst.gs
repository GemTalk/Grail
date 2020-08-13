! ------------------- Remove existing behavior from AddAst
expectvalue /Metaclass3       
doit
AddAst removeAllMethods.
AddAst class removeAllMethods.
%
! ------------------- Class methods for AddAst
! ------------------- Instance methods for AddAst
set compile_env: 0
category: 'other'
method: AddAst
left: leftOperand right: rightOperand

	^ leftOperand __add__ value: rightOperand
%
