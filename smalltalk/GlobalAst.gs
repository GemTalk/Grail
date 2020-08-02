! ------------------- Remove existing behavior from GlobalAst
expectvalue /Metaclass3       
doit
GlobalAst removeAllMethods.
GlobalAst class removeAllMethods.
%
! ------------------- Class methods for GlobalAst
! ------------------- Instance methods for GlobalAst
set compile_env: 0
category: 'other'
method: GlobalAst
evaluate: aScope

	names do: [:each | 
		| assoc |
		assoc := aScope globals associationAt: each.
		aScope addAssociation: assoc.
	].
%
category: 'other'
method: GlobalAst
initialize
	"Global(identifier* names)"

	| stream |
	stream := self stream.
	names := self collectAst: [
		(stream peekFor: $') ifFalse: [self error].
		(self stream upTo: $') asSymbol
	].
	self readPosition.
%
