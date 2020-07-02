! ------------------- Remove existing behavior from PyList
expectvalue /Metaclass3       
doit
PyList removeAllMethods.
PyList class removeAllMethods.
%
! ------------------- Class methods for PyList
! ------------------- Instance methods for PyList
set compile_env: 0
category: 'other'
method: PyList
evaluate
	"May wish to revisit context"
	^Py_List withAll: (elts collect: [:each | each evaluate])
%
category: 'other'
method: PyList
initialize
	"List(expr* elts, expr_context ctx)"
	
	elts := self collectAst:[self expression].
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
