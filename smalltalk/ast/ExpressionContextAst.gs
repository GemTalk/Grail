! ------------------- Remove existing behavior from ExpressionContextAst
removeallmethods ExpressionContextAst
removeallclassmethods ExpressionContextAst
set compile_env: 0
! ------------------- Class methods for ExpressionContextAst
category: 'other'
classmethod: ExpressionContextAst
isAbstract

	^self == ExpressionContextAst
%
! ------------------- Instance methods for ExpressionContextAst
category: 'other'
method: ExpressionContextAst
assertIsLoad

	self error: 'Expression Context should be <Load> but is <' , self class name , '>'.
%
category: 'other'
method: ExpressionContextAst
assertIsStore

	self error: 'Expression Context should be <Store> but is <' , self class name , '>'.
%
category: 'other'
method: ExpressionContextAst
isStoreCtx

	^false
%
