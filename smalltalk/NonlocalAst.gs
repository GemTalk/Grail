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
evaluate
	"Nothing to do?"
%
category: 'other'
method: NonlocalAst
initialize
	"Nonlocal(identifier* names)"

	| locals nonlocals stream |
	stream := self stream.
	names := self collectAst: [
		(stream peekFor: $') ifFalse: [self error].
		(self stream upTo: $') asSymbol
	].
	self readPosition.
	locals := self locals.
	nonlocals := locals parent locals.
	names do: [:each | 
		| assoc |
		assoc := nonlocals associationForWriteAt: each.
		locals addAssociation: assoc.
	].
%
