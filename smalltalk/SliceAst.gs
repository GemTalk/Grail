! ------------------- Remove existing behavior from SliceAst
expectvalue /Metaclass3       
doit
SliceAst removeAllMethods.
SliceAst class removeAllMethods.
%
! ------------------- Class methods for SliceAst
! ------------------- Instance methods for SliceAst
set compile_env: 0
category: 'other'
method: SliceAst
evaluate: aContainer scope: aScope

	self halt.
%
category: 'other'
method: SliceAst
initialize
	"Slice(expr? lower, expr? upper, expr? step)"

	lower:= self optionalExpression.
	self commaSpace.
	upper := self optionalExpression.
	self commaSpace.
	step := self optionalExpression.
	(self stream peekFor: $)) ifFalse: [self error].
%
