! ------------------- Remove existing behavior from PyAttribute
expectvalue /Metaclass3       
doit
PyAttribute removeAllMethods.
PyAttribute class removeAllMethods.
%
! ------------------- Class methods for PyAttribute
! ------------------- Instance methods for PyAttribute
set compile_env: 0
category: 'other'
method: PyAttribute
_attr
	^ attr
%
category: 'other'
method: PyAttribute
_ctx
	^ ctx
%
category: 'other'
method: PyAttribute
_value
	^ value
%
category: 'other'
method: PyAttribute
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: PyAttribute
call: mySelector arguments: myArguments keywords: keywords
	| receiver |
	self assertContextIsLoad.
	receiver := value evaluate.
	^receiver perform: mySelector with: myArguments with: keywords.
%
category: 'other'
method: PyAttribute
children

	^super children
		add: ctx;
		add: value;
		yourself
%
category: 'other'
method: PyAttribute
evaluate

	^(value associationAt: attr) value
%
category: 'other'
method: PyAttribute
id
	^attr
%
category: 'other'
method: PyAttribute
initialize
	"Attribute(expr value, identifier attr, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	attr := self string asSymbol.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
category: 'other'
method: PyAttribute
saveVariableAssociation
	"This is the attribute of an object, but the object isn't known till runtime 
	(since value is an expression), so we can't really bind to it now."
%
