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
	(body class == Array)
		ifTrue: [
			body do: [:each | (each class == AssignAst) ifTrue: [aStream nextPutAll: (each target id); space].
									 (each class == FunctionDefAst) ifTrue: [aStream nextPutAll: (each name); space].
			]
		]
		ifFalse: [body variables do: [:each | aStream nextPutAll: each; space].].

	aStream nextPutAll: ') asIdentitySet.'; lf .

	"print all the instructions in the block"
	body size == 1 ifTrue: [
		self smalltalkSourceFor: (body at: 1) parenthesisIf: 4 on: aStream.
		aStream nextPut: $..
	] ifFalse: [
		body do: [ :each |
			"print the instruction"
			self smalltalkSourceFor: each parenthesisIf: 4 on: aStream.
			aStream nextPut: $.; lf; yourself.
		].
		aStream position: aStream position - 1.

		aStream lf.
	].
%
category: 'other'
method: BlockAst
variables

	^variables.
%
