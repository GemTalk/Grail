! ------------------- Remove existing behavior from OrAst
expectvalue /Metaclass3       
doit
OrAst removeAllMethods.
OrAst class removeAllMethods.
%
! ------------------- Class methods for OrAst
! ------------------- Instance methods for OrAst
set compile_env: 0
category: 'other'
method: OrAst
evaluate: aScope

	^values anySatisfy: [:each | each evaluate: aScope].
%
