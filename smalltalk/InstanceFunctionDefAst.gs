! ------------------- Remove existing behavior from InstanceFunctionDefAst
removeAllMethods InstanceFunctionDefAst
removeAllClassMethods InstanceFunctionDefAst
! ------------------- Class methods for InstanceFunctionDefAst
! ------------------- Instance methods for InstanceFunctionDefAst
set compile_env: 0
category: 'other'
method: InstanceFunctionDefAst
evaluate: aScope

	aScope 
		set: name 
		to: (InstanceFunction newForNode: self scope: (aScope innerForNode: self))
%
