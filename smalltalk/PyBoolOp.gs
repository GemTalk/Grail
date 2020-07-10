! ------------------- Remove existing behavior from PyBoolOp
expectvalue /Metaclass3       
doit
PyBoolOp removeAllMethods.
PyBoolOp class removeAllMethods.
%
! ------------------- Class methods for PyBoolOp
! ------------------- Instance methods for PyBoolOp
set compile_env: 0
category: 'other'
method: PyBoolOp
evaluate
	^op values: values
%
category: 'other'
method: PyBoolOp
initialize
	"BoolOp(boolop op, expr* values)"

	op := PyBoolop parent: self.
	self commaSpace.
	values := self collectAst:[self expression].
	self readPosition.
%
