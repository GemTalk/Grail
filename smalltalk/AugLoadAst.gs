! ------------------- Remove existing behavior from AugLoadAst
expectvalue /Metaclass3       
doit
AugLoadAst removeAllMethods.
AugLoadAst class removeAllMethods.
%
! ------------------- Class methods for AugLoadAst
! ------------------- Instance methods for AugLoadAst
set compile_env: 0
category: 'other'
method: AugLoadAst
initialize2

	super initialize2.
	parent saveVariableAssociation.
%
