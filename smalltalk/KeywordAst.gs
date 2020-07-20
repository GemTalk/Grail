! ------------------- Remove existing behavior from KeywordAst
expectvalue /Metaclass3       
doit
KeywordAst removeAllMethods.
KeywordAst class removeAllMethods.
%
! ------------------- Class methods for KeywordAst
! ------------------- Instance methods for KeywordAst
set compile_env: 0
category: 'other'
method: KeywordAst
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: KeywordAst
initialize
	"keyword = (identifier? arg, expr value)"
	| next stream|
	stream := self stream.
	next := stream next: 8.
	next ~= 'keyword(' ifTrue: [self error.].
	(stream peekFor: $') ifFalse: [self error].
	arg := stream upTo: $'.
	self commaSpace.
	value := self expression.
	(stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: KeywordAst
name

	^arg
%
category: 'other'
method: KeywordAst
value

	^value
%
