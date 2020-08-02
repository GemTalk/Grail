! ------------------- Remove existing behavior from ExceptHandlerAst
expectvalue /Metaclass3       
doit
ExceptHandlerAst removeAllMethods.
ExceptHandlerAst class removeAllMethods.
%
! ------------------- Class methods for ExceptHandlerAst
! ------------------- Instance methods for ExceptHandlerAst
set compile_env: 0
category: 'other'
method: ExceptHandlerAst
children

	^super children
		add: type;
		add: body;
		yourself
%
category: 'other'
method: ExceptHandlerAst
evaluate: aScope

	self error: 'not called!?'.
	(name evaluate: aScope) ifNotNil: [:myName | myName halt].
	^body evaluate: aScope
%
category: 'other'
method: ExceptHandlerAst
initialize
	"ExceptHandler(expr? type, identifier? name, stmt* body)"
	
	| stream next |
	stream := self stream.
	next := stream upTo: $(.
	next = 'ExceptHandler' ifFalse: [self error].
	type := self optionalExpression.
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		name := stream upTo: $'.
		(stream peekFor: $,) ifFalse: [self error].
	] ifFalse: [
		| string |
		string := stream upTo: $,.
		string = 'None' ifFalse: [self error].
		name := NoneAst singleton.
	].
	stream skip: -1.
	self commaSpace.
	body := SuiteAst parent: self.
	self readPosition.
%
category: 'other'
method: ExceptHandlerAst
type

	^type
%
