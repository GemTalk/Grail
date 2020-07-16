! ------------------- Remove existing behavior from PyArguments
expectvalue /Metaclass3       
doit
PyArguments removeAllMethods.
PyArguments class removeAllMethods.
%
! ------------------- Class methods for PyArguments
! ------------------- Instance methods for PyArguments
set compile_env: 0
category: 'other'
method: PyArguments
_args
	^ args
%
category: 'other'
method: PyArguments
_defaults
	^ defaults
%
category: 'other'
method: PyArguments
_kw_defaults
	^ kw_defaults
%
category: 'other'
method: PyArguments
_kwarg
	^ kwarg
%
category: 'other'
method: PyArguments
_kwonlyargs
	^ kwonlyargs
%
category: 'other'
method: PyArguments
_vararg
	^ vararg
%
category: 'other'
method: PyArguments
children

	^super children
		addAll: args;
		add: vararg;
		addAll: kwonlyargs;
		addAll: kw_defaults;
		add: kwarg;
		addAll: defaults;
		yourself
%
category: 'other'
method: PyArguments
initialize
"arguments(arg* args, arg? vararg, arg* kwonlyargs, expr* kw_defaults,
                 arg? kwarg, expr* defaults)"

	| next stream|
	stream := self stream.
	next := stream next: 10.
	next ~= 'arguments(' ifTrue: [self error].
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
method: PyArguments
setValues: anArray

	1 to: args size do: [:i | 
		(args at: i ifAbsent: [nil]) ifNotNil: [:param |
			param value: (anArray at: i ifAbsent: [_remoteNil]).
		].
	].
%
