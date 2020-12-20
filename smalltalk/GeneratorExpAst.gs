! ------------------- Remove existing behavior from GeneratorExpAst
removeAllMethods GeneratorExpAst
removeAllClassMethods GeneratorExpAst
! ------------------- Class methods for GeneratorExpAst
! ------------------- Instance methods for GeneratorExpAst
set compile_env: 0
category: 'other'
method: GeneratorExpAst
initialize
	"GeneratorExp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [ComprehensionAst parent: self].
	self readPosition.
%
