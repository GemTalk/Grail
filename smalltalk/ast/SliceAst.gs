! ------------------- Remove existing behavior from SliceAst
removeallmethods SliceAst
removeallclassmethods SliceAst
set compile_env: 0
! ------------------- Class methods for SliceAst
! ------------------- Instance methods for SliceAst
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
category: 'other'
method: SliceAst
printSmalltalkOn: aStream

	self halt.
%
