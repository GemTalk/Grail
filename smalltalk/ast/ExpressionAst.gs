! ------------------- Remove existing behavior from ExpressionAst
removeallmethods ExpressionAst
removeallclassmethods ExpressionAst
set compile_env: 0
! ------------------- Class methods for ExpressionAst
category: 'other'
classmethod: ExpressionAst
isAbstract

	^self == ExpressionAst
%
! ------------------- Instance methods for ExpressionAst
