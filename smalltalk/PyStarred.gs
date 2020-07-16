! ------------------- Remove existing behavior from PyStarred
expectvalue /Metaclass3       
doit
PyStarred removeAllMethods.
PyStarred class removeAllMethods.
%
! ------------------- Class methods for PyStarred
! ------------------- Instance methods for PyStarred
set compile_env: 0
category: 'other'
method: PyStarred
children

	^super children
		add: ctx;
		add: value;
		yourself
%
category: 'other'
method: PyStarred
initialize
	"Starred(expr value, expr_context ctx)"

	| stream |
	stream := self stream.
	value := self expression.
	self commaSpace.
	ctx := PyExpressionContext parent: self.
	self readPosition.
%
