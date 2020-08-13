! ------------------- Remove existing behavior from StarredAst
expectvalue /Metaclass3       
doit
StarredAst removeAllMethods.
StarredAst class removeAllMethods.
%
! ------------------- Class methods for StarredAst
! ------------------- Instance methods for StarredAst
set compile_env: 0
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
