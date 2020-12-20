! ------------------- Remove existing behavior from USubAst
removeAllMethods USubAst
removeAllClassMethods USubAst
! ------------------- Class methods for USubAst
! ------------------- Instance methods for USubAst
set compile_env: 0
category: 'other'
method: USubAst
evaluate: aScope

	| x |
	x := operand evaluate: aScope.
	^x __neg__ value: x
%
