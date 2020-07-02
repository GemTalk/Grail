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
assertContextIsStore
	value assertContextIsStore.
%
category: 'other'
method: PySubscript
assign: aValue in: globals 

	slice assign: aValue to: value
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
	slice := Pyslice sliceFrom: self.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
