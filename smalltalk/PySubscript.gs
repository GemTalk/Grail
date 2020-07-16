! ------------------- Remove existing behavior from PySubscript
expectvalue /Metaclass3       
doit
PySubscript removeAllMethods.
PySubscript class removeAllMethods.
%
! ------------------- Class methods for PySubscript
! ------------------- Instance methods for PySubscript
set compile_env: 0
category: 'other'
method: PySubscript
_ctx
	^ ctx
%
category: 'other'
method: PySubscript
_slice
	^ slice
%
category: 'other'
method: PySubscript
_value
	^ value
%
category: 'other'
method: PySubscript
assertContextIsStore
	value assertContextIsStore.
%
category: 'other'
method: PySubscript
children

	^super children
		add: ctx;
		add: slice;
		add: value;
		yourself
%
category: 'other'
method: PySubscript
evaluate
	| x |
	value assertContextIsLoad.
	x := self variableAt: value.
	^slice evaluate: x
	
%
category: 'other'
method: PySubscript
initialize
	"Subscript(expr value, slice slice, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	slice := PySliceAbstract parent: self.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
category: 'other'
method: PySubscript
saveVariableAssociation
	"Not really a variable?"
%
