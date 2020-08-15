! ------------------- Remove existing behavior from ArgumentsAst
expectvalue /Metaclass3       
doit
ArgumentsAst removeAllMethods.
ArgumentsAst class removeAllMethods.
%
! ------------------- Class methods for ArgumentsAst
! ------------------- Instance methods for ArgumentsAst
set compile_env: 0
category: 'other'
method: ArgumentsAst
arguments: arguments keywords: keywords scope: aScope

	| missingArguments |
	missingArguments := Array new.
	1 to: args size do: [:i | 
		(args at: i ifAbsent: [nil]) ifNotNil: [:param |
			param 
				setTo: (arguments at: i ifAbsent: [ missingArguments add: param name asString]) 
				scope: aScope.
		].
	].
	(missingArguments size > 0) ifTrue: [ TypeError signal: (parent name asString, '() missing ', missingArguments size asString, ' required positional argument: ', ' ' join: missingArguments) ].
	1 to: kwonlyargs size do: [:i | 
		| param |
		param := kwonlyargs at: i.
		param
			setTo: (keywords at: param name ifAbsent: [(kw_defaults at: i) evaluate: aScope])
			scope: aScope.
	].
%
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
