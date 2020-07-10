! ------------------- Remove existing behavior from PyBoolOp
expectvalue /Metaclass3       
doit
PyBoolOp removeAllMethods.
PyBoolOp class removeAllMethods.
%
! ------------------- Class methods for PyBoolOp
set compile_env: 0
category: 'other'
classmethod: PyBoolOp
isAbstract

	^self == PyBoolOp
%
! ------------------- Instance methods for PyBoolOp
set compile_env: 0
category: 'other'
method: PyBoolOp
evaluate

	self subclassResponsibility.
%
category: 'other'
method: PyBoolOp
initialize
	"BoolOp(boolop op, expr* values)
				boolop = And | Or"

	(self stream peekFor: $)) ifFalse: [self error].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
