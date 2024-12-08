! ------------------- Remove existing behavior from ListCompAst
removeallmethods ListCompAst
removeallclassmethods ListCompAst
! ------------------- Class methods for ListCompAst
! ------------------- Instance methods for ListCompAst
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
