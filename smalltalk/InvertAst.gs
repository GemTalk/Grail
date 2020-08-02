! ------------------- Remove existing behavior from InvertAst
expectvalue /Metaclass3       
doit
InvertAst removeAllMethods.
InvertAst class removeAllMethods.
%
! ------------------- Class methods for InvertAst
! ------------------- Instance methods for InvertAst
set compile_env: 0
category: 'other'
method: InvertAst
evaluate: aScope

	^(operand evaluate: aScope) bitInvert
%
