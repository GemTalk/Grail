! ------------------- Remove existing behavior from StarredAst
removeallmethods StarredAst
removeallclassmethods StarredAst
set compile_env: 0
! ------------------- Class methods for StarredAst
! ------------------- Instance methods for StarredAst
category: 'other'
method: StarredAst
initialize
	"Starred(expr value, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
