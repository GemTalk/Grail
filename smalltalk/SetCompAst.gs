! ------------------- Remove existing behavior from SetCompAst
removeAllMethods SetCompAst
removeAllClassMethods SetCompAst
! ------------------- Class methods for SetCompAst
! ------------------- Instance methods for SetCompAst
set compile_env: 0
category: 'other'
method: SetCompAst
initialize
	"SetComp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [ComprehensionAst parent: self].
	self readPosition.
%
