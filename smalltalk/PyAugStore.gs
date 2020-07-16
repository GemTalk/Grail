! ------------------- Remove existing behavior from PyAugStore
expectvalue /Metaclass3       
doit
PyAugStore removeAllMethods.
PyAugStore class removeAllMethods.
%
! ------------------- Class methods for PyAugStore
! ------------------- Instance methods for PyAugStore
set compile_env: 0
category: 'other'
method: PyAugStore
initialize

	super initialize.
	parent saveVariableAssociation.
%
category: 'other'
method: PyAugStore
isStoreCtx

	^true
%
