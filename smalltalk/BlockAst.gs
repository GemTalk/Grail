! ------------------- Remove existing behavior from BlockAst
removeallmethods BlockAst
removeallclassmethods BlockAst
! ------------------- Class methods for BlockAst
! ------------------- Instance methods for BlockAst
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
printSmalltalkOn: aStream

	
	"initialize a set of written variables in the block"

	aStream nextPutAll: 'currentScope setHelperSymbols: #('.
	body class == Array ifTrue: [
		body do: [:each | 
			each addVariableNamesTo: aStream.
		].
	] ifFalse: [
		body variables do: [:each | aStream nextPutAll: each; space].
	].
	aStream nextPutAll: ') asIdentitySet.'; lf.

	"print all the instructions in the block"
	super printSmalltalkOn: aStream.
%
category: 'other'
method: BlockAst
variables

	^variables
%
