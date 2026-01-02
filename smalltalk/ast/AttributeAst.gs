! ------------------- Remove existing behavior from AttributeAst
removeallmethods AttributeAst
removeallclassmethods AttributeAst
set compile_env: 0
! ------------------- Class methods for AttributeAst
! ------------------- Instance methods for AttributeAst
category: 'other'
method: AttributeAst
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: AttributeAst
declareVariable

	value declareVariable.
%
category: 'other'
method: AttributeAst
id

	^attr
%
category: 'other'
method: AttributeAst
initialize
	"Attribute(expr value, identifier attr, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	attr := self string asSymbol.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: AttributeAst
printOn: aStream

	super printOn: aStream.
	aStream
		nextPut: $(;
		nextPutAll: value id;
		nextPut: $.;
		nextPutAll: attr;
		nextPut: $);
		yourself.
%
category: 'other'
method: AttributeAst
printSmalltalkOn: aStream

	self halt.
%
category: 'other'
method: AttributeAst
setSuperInfo: aScope

	aScope superInfo at: #'type' put: aScope outer astNode
%
