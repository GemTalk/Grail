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
associationAt: aSymbol

	^variables 
		associationAt: aSymbol
		ifAbsent: [ | assoc |
			assoc := self nonlocalAssociationAt: aSymbol.
			assoc ifNil: [
				assoc := SymbolAssociation newWithKey: aSymbol value: _remoteNil.
				variables addAssociation: assoc.
				assoc]]
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
category: 'other'
method: BlockAst
nonlocalAssociationAt: aSymbol

	self subclassResponsibility.
%
