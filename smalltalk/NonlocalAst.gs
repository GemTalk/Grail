! ------------------- Remove existing behavior from NonlocalAst
removeAllMethods NonlocalAst
removeAllClassMethods NonlocalAst
! ------------------- Class methods for NonlocalAst
! ------------------- Instance methods for NonlocalAst
set compile_env: 0
category: 'other'
method: NonlocalAst
evaluate: aScope

	names do: [:each | 
		| assoc |
		assoc := aScope outer associationAt: each.
		aScope addAssociation: assoc.
	].
%
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
