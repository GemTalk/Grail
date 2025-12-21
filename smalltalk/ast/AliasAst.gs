! ------------------- Remove existing behavior from AliasAst
removeallmethods AliasAst
removeallclassmethods AliasAst
! ------------------- Class methods for AliasAst
! ------------------- Instance methods for AliasAst
category: 'other'
method: AliasAst
asName

	^asName
%
category: 'other'
method: AliasAst
initialize
	"alias = (identifier name, identifier? asname)"

	| stream |
	stream := self stream.
	name := self string asSymbol.
	(stream peekFor: $,) ifFalse: [self error].
	stream skipSeparators.
	(stream peekFor: $') ifTrue: [
		asName := (stream upTo: $') asSymbol.
	] ifFalse: [
		| string |
		string := stream upTo: $,.
		string = 'None' ifFalse: [self error].
		asName := nil.
	].
	self readPositionOnly.
%
category: 'other'
method: AliasAst
name

	^name
%
category: 'other'
method: AliasAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: name;
		yourself.
	asName ifNotNil: [
		aStream
			nextPutAll: ' as ';
			nextPutAll: asName;
			yourself.
	].
	aStream nextPut: $).
%
