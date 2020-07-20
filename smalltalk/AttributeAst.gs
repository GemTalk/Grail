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
_attr
	^ attr
%
category: 'other'
method: AttributeAst
_ctx
	^ ctx
%
category: 'other'
method: AttributeAst
_value
	^ value
%
category: 'other'
method: AttributeAst
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: AttributeAst
call: mySelector arguments: myArguments keywords: keywords
	| receiver |
	self assertContextIsLoad.
	receiver := value evaluate.
	^receiver perform: mySelector with: myArguments with: keywords.
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
evaluate

	^(value associationAt: attr) value
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
saveVariableAssociation
	"This is the attribute of an object, but the object isn't known till runtime 
	(since value is an expression), so we can't really bind to it now."
%
