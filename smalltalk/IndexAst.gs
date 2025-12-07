! ------------------- Remove existing behavior from IndexAst
removeallmethods IndexAst
removeallclassmethods IndexAst
! ------------------- Class methods for IndexAst
! ------------------- Instance methods for IndexAst
category: 'other'
method: IndexAst
initialize
	"Index(expr value)"
	
	value := self expression.
	(self stream peekFor: $)) ifFalse: [self error].
%
