! ------------------- Remove existing behavior from PyOperator
expectvalue /Metaclass3       
doit
PyOperator removeAllMethods.
PyOperator class removeAllMethods.
%
! ------------------- Class methods for PyOperator
set compile_env: 0
category: 'other'
classmethod: PyOperator
isAbstract

	^self == PyOperator
%
! ------------------- Instance methods for PyOperator
set compile_env: 0
category: 'other'
method: PyOperator
initialize
	    "operator = Add | Sub | Mult | MatMult | Div | Mod | Pow | LShift
                 | RShift | BitOr | BitXor | BitAnd | FloorDiv"

	(self stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: PyOperator
left: leftOperand right: rightOperand

	self subclassResponsibility
%
