! ------------------- Remove existing behavior from ExpressionContextAst
removeAllMethods ExpressionContextAst
removeAllClassMethods ExpressionContextAst
! ------------------- Class methods for ExpressionContextAst
set compile_env: 0
category: 'other'
classmethod: ExpressionContextAst
isAbstract

	^self == ExpressionContextAst
%
! ------------------- Instance methods for ExpressionContextAst
set compile_env: 0
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
initialize
	"expr_context = Load | Store | Del | AugLoad | AugStore | Param"

	(self stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: ExpressionContextAst
isStoreCtx

	^false
%
