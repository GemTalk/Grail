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
associationForArgument: aSymbol

	^variables 
		associationAt: aSymbol
		ifAbsent: [ | assoc |
			assoc := SymbolAssociation newWithKey: aSymbol value: _remoteNil.
			variables addAssociation: assoc.
			assoc]
%
category: 'other'
method: BlockAst
associationForReadAt: aSymbol

	^variables 
		associationAt: aSymbol
		ifAbsent: [parent associationForReadAt2: aSymbol]
%
category: 'other'
method: BlockAst
associationForWriteAt: aSymbol

	^variables 
		associationAt: aSymbol
		ifAbsent: [ | assoc |
			assoc := SymbolAssociation newWithKey: aSymbol value: _remoteNil.
			variables addAssociation: assoc.
			assoc]
%
category: 'other'
method: BlockAst
initialize

	variables := SymbolDictionary new.
	super initialize.
%
category: 'other'
method: BlockAst
isGlobalScope

	^false
%
category: 'other'
method: BlockAst
locals

	^self
%
