! ------------------- Remove existing behavior from UAddAst
removeAllMethods UAddAst
removeAllClassMethods UAddAst
! ------------------- Class methods for UAddAst
! ------------------- Instance methods for UAddAst
set compile_env: 0
category: 'other'
method: UAddAst
evaluate: aScope

	^operand evaluate: aScope
%
