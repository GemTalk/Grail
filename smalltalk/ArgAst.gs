! ------------------- Remove existing behavior from ArgAst
expectvalue /Metaclass3       
doit
ArgAst removeAllMethods.
ArgAst class removeAllMethods.
%
! ------------------- Class methods for ArgAst
! ------------------- Instance methods for ArgAst
set compile_env: 0
category: 'other'
method: ArgAst
children

	^super children
		add: annotation;
		yourself
%
category: 'other'
method: ArgAst
initialize
	"arg = (identifier arg, expr? annotation)"

	| stream |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	arg := (stream upTo: $') asSymbol.
	self commaSpace.
	annotation := self optionalExpression.
	self readPosition.
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
