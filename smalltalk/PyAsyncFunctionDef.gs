! ------------------- Remove existing behavior from PyAsyncFunctionDef
expectvalue /Metaclass3       
doit
PyAsyncFunctionDef removeAllMethods.
PyAsyncFunctionDef class removeAllMethods.
%
! ------------------- Class methods for PyAsyncFunctionDef
! ------------------- Instance methods for PyAsyncFunctionDef
set compile_env: 0
category: 'other'
method: PyAsyncFunctionDef
addMissingPositions
%
category: 'other'
method: PyAsyncFunctionDef
initialize
	"AsyncFunctionDef(identifier name, arguments args,
							  stmt* body, expr* decorator_list, 
							  expr? returns)"

	| stream next |
	stream := self stream.
	name := stream upTo: $'.
	(stream peekFor: $,) ifFalse: [self error].
	self commaSpace.
	args := PyArguments parent: self.
	body := self suite.
	self commaSpace.
	decorator_list := self collectAst: [ self expression ].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		returns:= self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%
