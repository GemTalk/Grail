! ------------------- Remove existing behavior from PyDictComp
expectvalue /Metaclass3       
doit
PyDictComp removeAllMethods.
PyDictComp class removeAllMethods.
%
! ------------------- Class methods for PyDictComp
! ------------------- Instance methods for PyDictComp
set compile_env: 0
category: 'other'
method: PyDictComp
initialize
	"DictComp(expr key, expr value, comprehension* generators)"

	key := self expression.
	self commaSpace.
	value := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%
