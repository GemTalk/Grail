! ------------------- Remove existing behavior from AttributeAst
expectvalue /Metaclass3       
doit
AttributeAst removeAllMethods.
AttributeAst class removeAllMethods.
%
! ------------------- Class methods for AttributeAst
! ------------------- Instance methods for AttributeAst
set compile_env: 0
category: 'other'
method: AttributeAst
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: AttributeAst
assign: anObject scope: aScope

	(value evaluate: aScope)
		set: attr
		to: anObject
%
category: 'other'
method: AttributeAst
callWithArguments: anArray keywords: aSymbolDictionary scope: aScope

	| object |
	self assertContextIsLoad.
	object := value evaluate: aScope.
	^object
		call: attr
		withArguments: anArray
		keywords: aSymbolDictionary
		scope: aScope
%
category: 'other'
method: AttributeAst
children

	^super children
		add: ctx;
		add: value;
		yourself
%
category: 'other'
method: AttributeAst
declareVariable

	value declareVariable.
%
category: 'other'
method: AttributeAst
evaluate: aScope

	^(value evaluate: aScope) get: attr
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
