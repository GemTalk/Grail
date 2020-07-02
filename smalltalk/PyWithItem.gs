! ------------------- Remove existing behavior from PyWithItem
expectvalue /Metaclass3       
doit
PyWithItem removeAllMethods.
PyWithItem class removeAllMethods.
%
! ------------------- Class methods for PyWithItem
! ------------------- Instance methods for PyWithItem
set compile_env: 0
category: 'other'
method: PyWithItem
initialize
	"withitem = (expr context_expr, expr? optional_vars)"

	| stream next |
	stream := self stream.
	context_expr := self expression.
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		optional_vars := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
%
