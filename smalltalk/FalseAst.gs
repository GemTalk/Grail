! ------------------- Remove existing behavior from FalseAst
expectvalue /Metaclass3       
doit
FalseAst removeAllMethods.
FalseAst class removeAllMethods.
%
! ------------------- Class methods for FalseAst
! ------------------- Instance methods for FalseAst
set compile_env: 0
category: 'other'
method: FalseAst
evaluate: aScope

	^bool False
%
