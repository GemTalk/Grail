! ------------------- Remove existing behavior from ClassFunctionDefAst
removeAllMethods ClassFunctionDefAst
removeAllClassMethods ClassFunctionDefAst
! ------------------- Class methods for ClassFunctionDefAst
! ------------------- Instance methods for ClassFunctionDefAst
set compile_env: 0
category: 'other'
method: ClassFunctionDefAst
evaluate: aScope

	aScope 
		set: name 
		to: (ClassFunction newForNode: self scope: (aScope innerForNode: self))
%
