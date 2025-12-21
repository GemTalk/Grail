! ------------------- Remove existing behavior from ArgumentsAst
removeallmethods ArgumentsAst
removeallclassmethods ArgumentsAst
! ------------------- Class methods for ArgumentsAst
! ------------------- Instance methods for ArgumentsAst
category: 'other'
method: ArgumentsAst
args

	^args
%
category: 'other'
method: ArgumentsAst
defaults

	^defaults
%
category: 'other'
method: ArgumentsAst
initialize
	"arguments(arg* posonlyargs, arg* args, arg? vararg, arg* kwonlyargs,
		expr* kw_defaults, arg? kwarg, expr* defaults)"

	| next stream |
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
category: 'other'
method: ArgumentsAst
kw_defaults

	^kw_defaults
%
category: 'other'
method: ArgumentsAst
kwarg

	^kwarg
%
category: 'other'
method: ArgumentsAst
kwonlyargs

	^kwonlyargs
%
category: 'other'
method: ArgumentsAst
posonlyargs

	^posonlyargs
%
category: 'other'
method: ArgumentsAst
vararg

	^vararg
%
