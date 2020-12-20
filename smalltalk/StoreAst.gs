! ------------------- Remove existing behavior from StoreAst
removeAllMethods StoreAst
removeAllClassMethods StoreAst
! ------------------- Class methods for StoreAst
! ------------------- Instance methods for StoreAst
set compile_env: 0
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
