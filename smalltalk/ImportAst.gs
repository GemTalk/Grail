! ------------------- Remove existing behavior from ImportAst
removeallmethods ImportAst
removeallclassmethods ImportAst
! ------------------- Class methods for ImportAst
! ------------------- Instance methods for ImportAst
category: 'other'
method: ImportAst
initialize
	"Import(alias* names)"

	names := self collectAst: [self alias].
	self readPosition.
%
category: 'other'
method: ImportAst
printSmalltalkOn: aStream

	names do: [:each |
		| name alias |
		name := each name.
		alias := each asName.
		alias ifNil: [
			alias := name.
		].
		aStream
			nextPutAll: 'currentScope at: #''';
			nextPutAll: alias;
			nextPutAll: ''' put: (';
			nextPutAll: '(currentScope at: #__import__) scope: currentScope positional: { #''';
			nextPutAll: name;
			nextPutAll: '''. } named: {}).';
			lf;
			yourself.
	].
	aStream nextPutAll: 'None'.
%
