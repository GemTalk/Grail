! ------------------- Remove existing behavior from UAddAst
expectvalue /Metaclass3       
doit
UAddAst removeAllMethods.
UAddAst class removeAllMethods.
%
! ------------------- Class methods for UAddAst
! ------------------- Instance methods for UAddAst
set compile_env: 0
category: 'other'
method: UAddAst
evaluate

	^operand evaluate
%
category: 'other'
method: UAddAst
operand: x
	^x
%
