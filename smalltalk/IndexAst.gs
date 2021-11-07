! ------------------- Remove existing behavior from IndexAst
removeAllMethods IndexAst
removeAllClassMethods IndexAst
! ------------------- Class methods for IndexAst
! ------------------- Instance methods for IndexAst
set compile_env: 0
category: 'other'
method: IndexAst
initialize
	"Index(expr value)"
	
	value := self expression.
	(self stream peekFor: $)) ifFalse: [self error].
%
