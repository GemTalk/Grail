! ------------------- Remove existing behavior from NotAst
removeAllMethods NotAst
removeAllClassMethods NotAst
! ------------------- Class methods for NotAst
! ------------------- Instance methods for NotAst
set compile_env: 0
category: 'other'
method: NotAst
evaluate: aScope

	^(operand evaluate: aScope) not
%
