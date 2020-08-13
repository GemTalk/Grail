! ------------------- Remove existing behavior from TrueAst
expectvalue /Metaclass3       
doit
TrueAst removeAllMethods.
TrueAst class removeAllMethods.
%
! ------------------- Class methods for TrueAst
! ------------------- Instance methods for TrueAst
set compile_env: 0
category: 'other'
method: TrueAst
evaluate: aScope

	^bool True
%
