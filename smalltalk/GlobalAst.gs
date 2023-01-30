! ------------------- Remove existing behavior from GlobalAst
removeAllMethods GlobalAst
removeAllClassMethods GlobalAst
! ------------------- Class methods for GlobalAst
! ------------------- Instance methods for GlobalAst
set compile_env: 0
category: 'other'
method: GlobalAst
initialize
	"Global(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream skipSeparators; peekFor: $') ifFalse: [self error].
		(self stream upTo: $') asSymbol
	].
	self readPosition.
%
category: 'other'
method: GlobalAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'currentScope setAsGlobals: #('.
	names do: [:each |
		aStream
			nextPutAll: each;
			space;
			yourself.
	].
	aStream nextPut: $).
%
