! ------------------- Remove existing behavior from ClassFunctionDefAst
expectvalue /Metaclass3       
doit
ClassFunctionDefAst removeAllMethods.
ClassFunctionDefAst class removeAllMethods.
%
! ------------------- Class methods for ClassFunctionDefAst
! ------------------- Instance methods for ClassFunctionDefAst
set compile_env: 0
category: 'other'
method: ClassFunctionDefAst
evaluate: aScope

	aScope 
		set: name 
		to: (PyClassFunction newForNode: self scope: (aScope innerForNode: self))
%
