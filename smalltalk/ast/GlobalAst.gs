! ------------------- Remove existing behavior from GlobalAst
removeallmethods GlobalAst
removeallclassmethods GlobalAst
! ------------------- Class methods for GlobalAst
! ------------------- Instance methods for GlobalAst
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

	self halt.
%
