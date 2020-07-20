! ------------------- Remove existing behavior from MatMultAst
expectvalue /Metaclass3       
doit
MatMultAst removeAllMethods.
MatMultAst class removeAllMethods.
%
! ------------------- Class methods for MatMultAst
! ------------------- Instance methods for MatMultAst
set compile_env: 0
category: 'other'
method: MatMultAst
left: leftOperand right: rightOperand
	self error.
	^leftOperand bitShift: rightOperand
%
