! ------------------- Remove existing behavior from StoreAst
removeallmethods StoreAst
removeallclassmethods StoreAst
! ------------------- Class methods for StoreAst
! ------------------- Instance methods for StoreAst
category: 'other'
method: StoreAst
assertIsStore
	"Overide to avoid error"
%
category: 'other'
method: StoreAst
initialize

	super initialize.
	parent declareVariable.
%
