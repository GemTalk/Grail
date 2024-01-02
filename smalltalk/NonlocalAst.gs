! ------------------- Remove existing behavior from NonlocalAst
expectvalue /Metaclass3
doit
NonlocalAst removeAllMethods.
NonlocalAst class removeAllMethods.
%
! ------------------- Class methods for NonlocalAst
! ------------------- Instance methods for NonlocalAst
set compile_env: 0
category: 'other'
method: NonlocalAst
initialize
	"Nonlocal(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream skipSeparators; peekFor: $') ifFalse: [self error].
		(self stream upTo: $') asSymbol
	].
	self readPosition.
%
category: 'other'
method: NonlocalAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'currentScope setAsNonlocals: #('.
	names do: [:each |
		aStream
			nextPutAll: each;
			space;
			yourself.
	].
	aStream nextPut: $).
%
