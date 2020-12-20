! ------------------- Remove existing behavior from IsNotAst
removeAllMethods IsNotAst
removeAllClassMethods IsNotAst
! ------------------- Class methods for IsNotAst
! ------------------- Instance methods for IsNotAst
set compile_env: 0
category: 'other'
method: IsNotAst
left: lhs right: rhs

	((lhs isKindOf: AbstractNumber) and: [rhs isKindOf: AbstractNumber])
		ifTrue: [^lhs ___number ~~ rhs ___number ifTrue: [True] ifFalse: [False]].
	((lhs isKindOf: str) and: [rhs isKindOf: str])
		ifTrue: [^lhs ___container ~= rhs ___container ifTrue: [True] ifFalse: [False]].
	^lhs ~~ rhs ifTrue: [True] ifFalse: [False]
%
