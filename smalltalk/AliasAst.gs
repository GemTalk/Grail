! ------------------- Remove existing behavior from AliasAst
expectvalue /Metaclass3
doit
AliasAst removeAllMethods.
AliasAst class removeAllMethods.
%
! ------------------- Class methods for AliasAst
! ------------------- Instance methods for AliasAst
set compile_env: 0
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
		(stream peekFor: $)) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $).
		string = 'None' ifFalse: [self error].
		asName := nil.
	].
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
