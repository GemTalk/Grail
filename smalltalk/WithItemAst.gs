! ------------------- Remove existing behavior from WithItemAst
expectvalue /Metaclass3
doit
WithItemAst removeAllMethods.
WithItemAst class removeAllMethods.
%
! ------------------- Class methods for WithItemAst
! ------------------- Instance methods for WithItemAst
set compile_env: 0
category: 'other'
method: WithItemAst
initialize
	"withitem = (expr context_expr, expr? optional_vars)"

	| stream next |
	stream := self stream.
	next := stream peekN: 9.
	next ~= 'withitem(' ifTrue: [self error].
	stream next: 9.
	context_expr := self expression.
	self commaSpace.
	next := stream peekN: 4.
	optional_vars := self optionalExpression.
	(stream peekFor: $)) ifFalse: [self error].
%
