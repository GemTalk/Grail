! ------------------- Remove existing behavior from ListAst
removeAllMethods ListAst
removeAllClassMethods ListAst
! ------------------- Class methods for ListAst
! ------------------- Instance methods for ListAst
set compile_env: 0
category: 'other'
method: ListAst
initialize
	"list(expr* elts, expr_context ctx)"
	
	elts := self collectAst: [self expression].
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
