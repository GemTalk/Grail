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
addMissingPositions

	value addMissingPositions.
%
category: 'other'
method: PyAttribute
assertContextIsLoad

	ctx assertIsLoad.
%
category: 'other'
method: PyAttribute
call: aPyCall
	| receiver |
	receiver := value evaluate.
	self halt.
	self assertContextIsLoad.
	^Builtins current call: aPyCall
%
category: 'other'
method: PyAttribute
call: mySelector arguments: myArguments keywords: myKeywords
	| receiver |
	self assertContextIsLoad.
	receiver := value evaluate.
	^receiver perform: mySelector with: myArguments with: myKeywords.
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
	attr := self string.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
