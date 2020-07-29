! ------------------- Remove existing behavior from AugStoreAst
expectvalue /Metaclass3       
doit
AugStoreAst removeAllMethods.
AugStoreAst class removeAllMethods.
%
! ------------------- Class methods for AugStoreAst
! ------------------- Instance methods for AugStoreAst
set compile_env: 0
category: 'other'
method: AugStoreAst
initialize

	super initialize.
	parent saveVariableAssociationForWrite.
%
category: 'other'
method: AugStoreAst
isStoreCtx

	^true
%
