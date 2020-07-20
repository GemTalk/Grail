! ------------------- Remove existing behavior from DelAst
expectvalue /Metaclass3       
doit
DelAst removeAllMethods.
DelAst class removeAllMethods.
%
! ------------------- Class methods for DelAst
! ------------------- Instance methods for DelAst
set compile_env: 0
category: 'other'
method: DelAst
initialize2

	super initialize2.
	parent saveVariableAssociation.
%
