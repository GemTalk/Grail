! ------------------- Remove existing behavior from USubAst
expectvalue /Metaclass3       
doit
USubAst removeAllMethods.
USubAst class removeAllMethods.
%
! ------------------- Class methods for USubAst
! ------------------- Instance methods for USubAst
set compile_env: 0
category: 'other'
method: USubAst
evaluate

	^operand evaluate negated
%
category: 'other'
method: USubAst
operand: x
	^x evaluate negated
%
