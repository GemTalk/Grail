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
initialize
"arguments(arg* args, arg? vararg, arg* kwonlyargs, expr* kw_defaults,
                 arg? kwarg, expr* defaults)"

	| next stream|
	stream := self stream.
	next := stream next: 10.
	next ~= 'arguments(' ifTrue: [self error.].
	args := self collectAst: [self arg].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		vararg := self arg.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	kwonlyargs := self collectAst: [self arg].
	self commaSpace.
	kw_defaults := self collectAst: [self expression].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		kwarg := self arg.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self commaSpace.
	defaults := self collectAst: [self expression].
	(stream peekFor: $)) ifFalse: [self error].
%
