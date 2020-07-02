! ------------------- Remove existing behavior from PyGeneratorExp
expectvalue /Metaclass3       
doit
PyGeneratorExp removeAllMethods.
PyGeneratorExp class removeAllMethods.
%
! ------------------- Class methods for PyGeneratorExp
! ------------------- Instance methods for PyGeneratorExp
set compile_env: 0
category: 'other'
method: PyGeneratorExp
initialize
	"GeneratorExp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%
