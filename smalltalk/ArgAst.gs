! ------------------- Remove existing behavior from ArgAst
removeAllMethods ArgAst
removeAllClassMethods ArgAst
! ------------------- Class methods for ArgAst
! ------------------- Instance methods for ArgAst
set compile_env: 0
category: 'other'
method: ArgAst
initialize
	"arg = (identifier arg, expr? annotation, string? type_comment) "

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	arg := str withAll: (stream upTo: $').
	self commaSpace.
	annotation := self optionalExpression.
	self commaSpace.
	type_comment := self optionalString.
	self readPosition.
%
category: 'other'
method: ArgAst
name

	^arg
%
category: 'other'
method: ArgAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: arg;
		nextPut: $);
		yourself.
%
category: 'other'
method: ArgAst
setTo: anObject scope: aScope

	aScope set: arg to: anObject.
%
