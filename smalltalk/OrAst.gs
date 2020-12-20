! ------------------- Remove existing behavior from OrAst
removeAllMethods OrAst
removeAllClassMethods OrAst
! ------------------- Class methods for OrAst
! ------------------- Instance methods for OrAst
set compile_env: 0
category: 'other'
method: OrAst
evaluate: aScope

	^values anySatisfy: [:each | each evaluate: aScope].
%
