! ------------------- Remove existing behavior from OperatorAst
removeAllMethods OperatorAst
removeAllClassMethods OperatorAst
! ------------------- Class methods for OperatorAst
set compile_env: 0
category: 'other'
classmethod: OperatorAst
isAbstract

	^self == OperatorAst
%
! ------------------- Instance methods for OperatorAst
set compile_env: 0
category: 'other'
method: OperatorAst
initialize
	    "operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
                 | RShift | BitOr | BitXor | BitAnd | FloorDiv"

	(self stream peekFor: $)) ifFalse: [self error].
%
