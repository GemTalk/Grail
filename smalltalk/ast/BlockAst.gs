! ------------------- Remove existing behavior from BlockAst
removeallmethods BlockAst
removeallclassmethods BlockAst
set compile_env: 0
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
variables

	^variables
%
category: 'other'
method: BlockAst
printSmalltalkOn: aStream

	self printSmalltalkOn: aStream useTemps: true.
%
category: 'other'
method: BlockAst
printSmalltalkOn: aStream useTemps: aBoolean

	(aBoolean and: [variables notEmpty]) ifTrue: [
		aStream nextPut: $|.
		variables do: [:each | aStream space; nextPutAll: each].
		aStream nextPutAll: ' |'; lf.
	].
	body do: [:each |
		each printSmalltalkOn: aStream.
		aStream lf.
	].
%
