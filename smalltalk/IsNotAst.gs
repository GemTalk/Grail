! ------------------- Remove existing behavior from IsNotAst
expectvalue /Metaclass3       
doit
IsNotAst removeAllMethods.
IsNotAst class removeAllMethods.
%
! ------------------- Class methods for IsNotAst
! ------------------- Instance methods for IsNotAst
set compile_env: 0
category: 'other'
method: IsNotAst
left: leftOperand right: rightOperand

	^((leftOperand isKindOf: AbstractNumber) and: [rightOperand isKindOf: AbstractNumber])
		ifTrue: [leftOperand.number ~~ rightOperand.number ifTrue: [True] ifFalse: [False]]
		ifFalse: [leftOperand ~~ rightOperand ifTrue: [True] ifFalse: [False]]
%
