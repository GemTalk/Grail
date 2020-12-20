! ------------------- Remove existing behavior from ExpressionAst
removeAllMethods ExpressionAst
removeAllClassMethods ExpressionAst
! ------------------- Class methods for ExpressionAst
set compile_env: 0
category: 'other'
classmethod: ExpressionAst
isAbstract

	^self == ExpressionAst
%
! ------------------- Instance methods for ExpressionAst
set compile_env: 0
category: 'other'
method: ExpressionAst
evaluate: aScope

	self subclassResponsibility.
%
