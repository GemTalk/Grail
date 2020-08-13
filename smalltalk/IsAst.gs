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
left: leftOperand right: rightOperand

	^((leftOperand isKindOf: AbstractNumber) and: [rightOperand isKindOf: AbstractNumber])
		ifTrue: [leftOperand.number == rightOperand.number ifTrue: [True] ifFalse: [False]]
		ifFalse: [leftOperand == rightOperand ifTrue: [True] ifFalse: [False]]
%
