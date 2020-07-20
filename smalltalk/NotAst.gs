! ------------------- Remove existing behavior from NotAst
expectvalue /Metaclass3       
doit
NotAst removeAllMethods.
NotAst class removeAllMethods.
%
! ------------------- Class methods for NotAst
! ------------------- Instance methods for NotAst
set compile_env: 0
category: 'other'
method: NotAst
evaluate

	^operand evaluate not
%
category: 'other'
method: NotAst
operand: x
	^x not
%
