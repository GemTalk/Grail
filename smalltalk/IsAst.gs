! ------------------- Remove existing behavior from IsAst
expectvalue /Metaclass3       
doit
IsAst removeAllMethods.
IsAst class removeAllMethods.
%
! ------------------- Class methods for IsAst
! ------------------- Instance methods for IsAst
set compile_env: 0
category: 'other'
method: IsAst
left: lhs right: rhs

	((lhs isKindOf: AbstractNumber) and: [rhs isKindOf: AbstractNumber])
		ifTrue: [^lhs ___number == rhs ___number ifTrue: [True] ifFalse: [False]].
	((lhs isKindOf: str) and: [rhs isKindOf: str])
		ifTrue: [^lhs ___container = rhs ___container ifTrue: [True] ifFalse: [False]].
	^lhs == rhs ifTrue: [True] ifFalse: [False]
%
