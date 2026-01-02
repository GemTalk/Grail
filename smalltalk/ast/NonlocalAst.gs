! ------------------- Remove existing behavior from NonlocalAst
removeallmethods NonlocalAst
removeallclassmethods NonlocalAst
set compile_env: 0
! ------------------- Class methods for NonlocalAst
! ------------------- Instance methods for NonlocalAst
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

	self halt.
%
