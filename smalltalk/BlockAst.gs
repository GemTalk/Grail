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
			each class == AssignAst ifTrue: [aStream nextPutAll: each target id; space].
			each class == FunctionDefAst ifTrue: [aStream nextPutAll: each name; space].
		].
	] ifFalse: [
		body variables do: [:each | aStream nextPutAll: each; space].
	].
	aStream nextPutAll: ') asIdentitySet.'; lf.

	"print all the instructions in the block"
	body size == 1 ifTrue: [
		body first printSmalltalkOn: aStream.
		aStream nextPut: $..
	] ifFalse: [
		body do: [:each |
			"print the instruction"
			each printSmalltalkOn: aStream.
			aStream nextPut: $.; lf; yourself.
		].
		aStream position: aStream position - 1.
		aStream lf.
	].
%
category: 'other'
method: BlockAst
variables

	^variables
%
