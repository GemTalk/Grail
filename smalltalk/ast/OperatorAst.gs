! ------------------- Remove existing behavior from OperatorAst
removeallmethods OperatorAst
removeallclassmethods OperatorAst
set compile_env: 0
! ------------------- Class methods for OperatorAst
category: 'other'
classmethod: OperatorAst
isAbstract

	^self == OperatorAst
%
! ------------------- Instance methods for OperatorAst
