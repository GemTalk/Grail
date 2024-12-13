! ------------------- Remove existing behavior from OperatorAst
removeallmethods OperatorAst
removeallclassmethods OperatorAst
! ------------------- Class methods for OperatorAst
category: 'other'
classmethod: OperatorAst
isAbstract

	^self == OperatorAst
%
! ------------------- Instance methods for OperatorAst
category: 'other'
method: OperatorAst
initialize
	    "operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
                 | RShift | BitOr | BitXor | BitAnd | FloorDiv"

	(self stream peekFor: $)) ifFalse: [self error].
%
