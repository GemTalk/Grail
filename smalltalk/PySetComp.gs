! ------------------- Remove existing behavior from PySetComp
expectvalue /Metaclass3       
doit
PySetComp removeAllMethods.
PySetComp class removeAllMethods.
%
! ------------------- Class methods for PySetComp
! ------------------- Instance methods for PySetComp
set compile_env: 0
category: 'other'
method: PySetComp
initialize
	"SetComp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%
