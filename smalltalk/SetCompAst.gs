! ------------------- Remove existing behavior from SetCompAst
removeallmethods SetCompAst
removeallclassmethods SetCompAst
! ------------------- Class methods for SetCompAst
! ------------------- Instance methods for SetCompAst
category: 'other'
method: SetCompAst
initialize
	"SetComp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [ComprehensionAst parent: self].
	self readPosition.
%
