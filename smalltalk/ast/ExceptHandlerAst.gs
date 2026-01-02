! ------------------- Remove existing behavior from ExceptHandlerAst
removeallmethods ExceptHandlerAst
removeallclassmethods ExceptHandlerAst
set compile_env: 0
! ------------------- Class methods for ExceptHandlerAst
! ------------------- Instance methods for ExceptHandlerAst
category: 'other'
method: ExceptHandlerAst
body

	^body
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
		name := None.
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
