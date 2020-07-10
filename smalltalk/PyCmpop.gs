! ------------------- Remove existing behavior from PyCmpOp
expectvalue /Metaclass3       
doit
PyCmpOp removeAllMethods.
PyCmpOp class removeAllMethods.
%
! ------------------- Class methods for PyCmpOp
set compile_env: 0
category: 'other'
classmethod: PyCmpOp
isAbstract

	^self == PyCmpOp
%
! ------------------- Instance methods for PyCmpOp
set compile_env: 0
category: 'other'
method: PyCmpOp
initialize
	"cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"

	(self stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: PyCmpOp
left: leftOperand right: rightOperand

	^leftOperand evaluate + rightOperand evaluate
%
