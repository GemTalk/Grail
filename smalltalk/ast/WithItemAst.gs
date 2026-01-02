! ------------------- Remove existing behavior from WithItemAst
removeallmethods WithItemAst
removeallclassmethods WithItemAst
set compile_env: 0
! ------------------- Class methods for WithItemAst
! ------------------- Instance methods for WithItemAst
category: 'Accessing'
method: WithItemAst
context_expr

	^context_expr
%
category: 'Accessing'
method: WithItemAst
optional_vars

	^optional_vars
%
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
