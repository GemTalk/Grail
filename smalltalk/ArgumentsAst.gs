! ------------------- Remove existing behavior from ArgumentsAst
removeAllMethods ArgumentsAst
removeAllClassMethods ArgumentsAst
! ------------------- Class methods for ArgumentsAst
! ------------------- Instance methods for ArgumentsAst
set compile_env: 0
category: 'other'
method: ArgumentsAst
initialize
"arguments(arg* posonlyargs, arg* args, arg? vararg, arg* kwonlyargs,
                 expr* kw_defaults, arg? kwarg, expr* defaults)"

	| next stream|
	stream := self stream.
	next := stream next: 10.
	next ~= 'arguments(' ifTrue: [self error].
	posonlyargs := self collectAst: [self arg].
	self commaSpace.
	args := self collectAst: [self arg].
	self commaSpace.
	vararg := self optionalArg.
	self commaSpace.
	kwonlyargs := self collectAst: [self arg].
	self commaSpace.
	kw_defaults := self collectAst: [self expression].
	self commaSpace.
	kwarg := self optionalArg.
	self commaSpace.
	defaults := self collectAst: [self expression].
	(stream peekFor: $)) ifFalse: [self error].
%
