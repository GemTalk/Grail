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
	attr := self string.
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: AttributeAst
saveVariableAssociation
	"Not really a variable"
%
