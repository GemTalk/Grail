! ------------------- Remove existing behavior from LoadAst
expectvalue /Metaclass3       
doit
LoadAst removeAllMethods.
LoadAst class removeAllMethods.
%
! ------------------- Class methods for LoadAst
! ------------------- Instance methods for LoadAst
set compile_env: 0
category: 'other'
method: LoadAst
assertIsLoad
	"Override to avoid inherited error"
%
category: 'other'
method: LoadAst
initialize2

	super initialize2.
	parent saveVariableAssociation.
%
