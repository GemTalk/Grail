! ------------------- Remove existing behavior from ListCompAst
removeAllMethods ListCompAst
removeAllClassMethods ListCompAst
! ------------------- Class methods for ListCompAst
! ------------------- Instance methods for ListCompAst
set compile_env: 0
category: 'other'
method: ListCompAst
initialize
	"ListComp(expr elt, comprehension* generators)"
	| stream |
	stream := self stream.
	elt := self expression.
	self commaSpace.
	generators := self collectAst: [ComprehensionAst parent: self].
	self readPosition.
%
