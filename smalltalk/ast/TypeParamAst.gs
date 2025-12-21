! ------------------- Remove existing behavior from TypeParamAst
removeallmethods TypeParamAst
removeallclassmethods TypeParamAst
! ------------------- Class methods for TypeParamAst
! ------------------- Instance methods for TypeParamAst
category: 'other'
method: TypeParamAst
initialize
	"type_param = TypeVar(identifier name, expr? bound)
               | ParamSpec(identifier name)
               | TypeVarTuple(identifier name)
               attributes (int lineno, int col_offset, int end_lineno, int end_col_offset)"

	| stream char |
	stream := self stream.
	char := stream peek.
	self halt.
%
