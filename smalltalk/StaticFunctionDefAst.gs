! ------------------- Remove existing behavior from StaticFunctionDefAst
expectvalue /Metaclass3       
doit
StaticFunctionDefAst removeAllMethods.
StaticFunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for StaticFunctionDefAst
! ------------------- Instance methods for StaticFunctionDefAst
set compile_env: 0
category: 'other'
method: StaticFunctionDefAst
evaluate: aScope

	aScope 
		set: name 
		to: (StaticFunction newForNode: self scope: (aScope innerForNode: self))
%
