! ------------------- Remove existing behavior from GeneratorExpAst
removeallmethods GeneratorExpAst
removeallclassmethods GeneratorExpAst
! ------------------- Class methods for GeneratorExpAst
! ------------------- Instance methods for GeneratorExpAst
category: 'other'
method: GeneratorExpAst
initialize
	"GeneratorExp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [ComprehensionAst parent: self].
	self readPosition.
%
