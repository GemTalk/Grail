! ------------------- Remove existing behavior from InvertAst
removeAllMethods InvertAst
removeAllClassMethods InvertAst
! ------------------- Class methods for InvertAst
! ------------------- Instance methods for InvertAst
set compile_env: 0
category: 'other'
method: InvertAst
evaluate: aScope

	^(operand evaluate: aScope) bitInvert
%
