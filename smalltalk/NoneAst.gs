! ------------------- Remove existing behavior from NoneAst
expectvalue /Metaclass3       
doit
NoneAst removeAllMethods.
NoneAst class removeAllMethods.
%
! ------------------- Class methods for NoneAst
! ------------------- Instance methods for NoneAst
set compile_env: 0
category: 'other'
method: NoneAst
evaluate: aScope

	^nil
%
category: 'other'
method: NoneAst
isNone

	^true
%
