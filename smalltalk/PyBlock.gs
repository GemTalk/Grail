! ------------------- Remove existing behavior from PyBlock
expectvalue /Metaclass3       
doit
PyBlock removeAllMethods.
PyBlock class removeAllMethods.
%
! ------------------- Class methods for PyBlock
! ------------------- Instance methods for PyBlock
set compile_env: 0
category: 'other'
method: PyBlock
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
method: PyBlock
initialize

	variables := SymbolDictionary new.
	super initialize.
%
category: 'other'
method: PyBlock
nonlocalAssociationAt: aSymbol

	self subclassResponsibility.
%
