! ------------------- Remove existing behavior from CmpOpAst
removeAllMethods CmpOpAst
removeAllClassMethods CmpOpAst
! ------------------- Class methods for CmpOpAst
set compile_env: 0
category: 'other'
classmethod: CmpOpAst
isAbstract

	^self == CmpOpAst
%
! ------------------- Instance methods for CmpOpAst
set compile_env: 0
category: 'other'
method: CmpOpAst
initialize
	"cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"

	(self stream peekFor: $)) ifFalse: [self error].
%
