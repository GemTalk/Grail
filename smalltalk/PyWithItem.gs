! ------------------- Remove existing behavior from PyWithItem
expectvalue /Metaclass3       
doit
PyWithItem removeAllMethods.
PyWithItem class removeAllMethods.
%
! ------------------- Class methods for PyWithItem
! ------------------- Instance methods for PyWithItem
set compile_env: 0
category: 'other'
method: PyWithItem
children

	^super children
		add: context_expr;
		add: optional_vars;
		yourself
%
category: 'other'
method: PyWithItem
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
