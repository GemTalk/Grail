! ------------------- Remove existing behavior from PyExceptHandler
expectvalue /Metaclass3       
doit
PyExceptHandler removeAllMethods.
PyExceptHandler class removeAllMethods.
%
! ------------------- Class methods for PyExceptHandler
! ------------------- Instance methods for PyExceptHandler
set compile_env: 0
category: 'other'
method: PyExceptHandler
children

	^super children
		add: type;
		add: body;
		yourself
%
category: 'other'
method: PyExceptHandler
evaluate

	name evaluate ifNotNil: [:myName | myName halt].
	^body evaluate
%
category: 'other'
method: PyExceptHandler
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
		name := PyNone singleton.
	].
	stream skip: -1.
	self commaSpace.
	body := PySuite parent: self.
	self readPosition.
%
category: 'other'
method: PyExceptHandler
type

	^type
%
