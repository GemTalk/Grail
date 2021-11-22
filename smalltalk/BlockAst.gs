! ------------------- Remove existing behavior from BlockAst
removeAllMethods BlockAst
removeAllClassMethods BlockAst
! ------------------- Class methods for BlockAst
! ------------------- Instance methods for BlockAst
set compile_env: 0
category: 'other'
method: BlockAst
declareVariable: aSymbol

	variables add: aSymbol.
%
category: 'other'
method: BlockAst
initialize

	variables := IdentitySet new.
	super initialize.
%
category: 'other'
method: BlockAst
isVariableIsDeclared: aSymbol

	^variables includes: aSymbol
%
