! ------------------- Remove existing behavior from SliceAst
removeAllMethods SliceAst
removeAllClassMethods SliceAst
! ------------------- Class methods for SliceAst
! ------------------- Instance methods for SliceAst
set compile_env: 0
category: 'other'
method: SliceAst
initialize
	"Slice(expr? lower, expr? upper, expr? step)"

	lower:= self optionalExpression.
	self commaSpace.
	upper := self optionalExpression.
	self commaSpace.
	step := self optionalExpression.
	self readPosition.
%
