! ------------------- Remove existing behavior from InstanceFunctionDefAst
expectvalue /Metaclass3       
doit
InstanceFunctionDefAst removeAllMethods.
InstanceFunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for InstanceFunctionDefAst
! ------------------- Instance methods for InstanceFunctionDefAst
set compile_env: 0
category: 'other'
method: InstanceFunctionDefAst
evaluate: aScope

	aScope 
		set: name 
		to: (PyInstanceFunction newForNode: self scope: (aScope innerForNode: self))
%
