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
<<<<<<< HEAD
=======
evaluate: aScope

	names do: [:each | 
		| assoc |
		assoc := aScope outer associationAt: each.
		aScope addAssociation: assoc.
	].
%
category: 'other'
method: NonlocalAst
>>>>>>> master
initialize
	"Nonlocal(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream peekFor: $') ifFalse: [self error].
		(self stream upTo: $') asSymbol
	].
	self readPosition.
%
