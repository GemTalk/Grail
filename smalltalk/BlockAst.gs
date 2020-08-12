! ------------------- Remove existing behavior from BlockAst
expectvalue /Metaclass3       
doit
BlockAst removeAllMethods.
BlockAst class removeAllMethods.
%
! ------------------- Class methods for BlockAst
! ------------------- Instance methods for BlockAst
set compile_env: 0
category: 'other'
method: BlockAst
assertVariableIsDeclared: aSymbol

	^ variables includes: aSymbol
%
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

	^ variables includes: aSymbol
%
