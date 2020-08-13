! ------------------- Remove existing behavior from NotInAst
expectvalue /Metaclass3       
doit
NotInAst removeAllMethods.
NotInAst class removeAllMethods.
%
! ------------------- Class methods for NotInAst
! ------------------- Instance methods for NotInAst
set compile_env: 0
category: 'other'
method: NotInAst
left: leftOperand right: rightOperand

	^rightOperand __not_contains__ value: leftOperand
%
