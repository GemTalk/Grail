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
printSmalltalkOn: aStream
	
	"initialize a set of written variables in the block"
	aStream nextPutAll: '|vars|'; lf.
	aStream nextPutAll: 'vars := #('.
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
	] ifFalse: [
		body do: [ :each |
			"remove the assigned variable or function name from the set"
			(each class == AssignAst) ifTrue: [aStream nextPutAll: 'vars remove: '; nextPut: $# ; nextPutAll: (each target id) ; nextPutAll: ' ifAbsent: []'; nextPut: $. ; lf].
			(each class == FunctionDefAst) ifTrue: [aStream nextPutAll: 'vars remove: '; nextPut: $' ; nextPutAll: (each name); nextPut: $' ; nextPutAll: ' ifAbsent: []'; nextPut: $. ; lf].
			
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
