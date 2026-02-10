! ------------------- Remove existing behavior from ImportAst
removeallmethods ImportAst
removeallclassmethods ImportAst
set compile_env: 0
! ------------------- Class methods for ImportAst
! ------------------- Instance methods for ImportAst
category: 'other'
method: ImportAst
printSmalltalkOn: aStream

	names doWithIndex: [:each :index |
		| importName targetName nameParts |
		importName := each name.
		targetName := each asName ifNil: [
			(importName includes: $.)
				ifTrue: [
					nameParts := $. split: importName asString.
					nameParts first asSymbol
				]
				ifFalse: [importName]
		].
		aStream
			nextPutAll: targetName;
			nextPutAll: ' := __import__ value: { ''';
			nextPutAll: importName asString;
			nextPutAll: ''' } value: nil.'.
		index < names size ifTrue: [aStream lf].
	].
%
