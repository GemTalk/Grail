! ------------------- Remove existing behavior from ExpressionAst
expectvalue /Metaclass3
doit
ExpressionAst removeAllMethods.
ExpressionAst class removeAllMethods.
%
! ------------------- Class methods for ExpressionAst
set compile_env: 0
category: 'other'
classmethod: ExpressionAst
isAbstract

	^self == ExpressionAst
%
! ------------------- Instance methods for ExpressionAst
