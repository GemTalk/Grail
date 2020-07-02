! ------------------- Remove existing behavior from PyAsyncFor
expectvalue /Metaclass3       
doit
PyAsyncFor removeAllMethods.
PyAsyncFor class removeAllMethods.
%
! ------------------- Class methods for PyAsyncFor
! ------------------- Instance methods for PyAsyncFor
set compile_env: 0
category: 'other'
method: PyAsyncFor
addMissingPositions
%
category: 'other'
method: PyAsyncFor
initialize
	"AsyncFor(expr target, expr iter, stmt* body, stmt* orelse)"

	target := self expression.
	self commaSpace.
	iter := self expression.
	self commaSpace.
	body := self suite.
	self commaSpace.
	orelse := self suite.
	self readPosition.
%
