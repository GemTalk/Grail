! ------------------- Remove existing behavior from PyFunctionDef
expectvalue /Metaclass3       
doit
PyFunctionDef removeAllMethods.
PyFunctionDef class removeAllMethods.
%
! ------------------- Class methods for PyFunctionDef
! ------------------- Instance methods for PyFunctionDef
set compile_env: 0
category: 'other'
method: PyFunctionDef
_args
	^ args
%
category: 'other'
method: PyFunctionDef
_body
	^ body
%
category: 'other'
method: PyFunctionDef
_decorator_list
	^ decorator_list
%
category: 'other'
method: PyFunctionDef
_name
	^ name
%
category: 'other'
method: PyFunctionDef
_returns
	^ returns
%
category: 'other'
method: PyFunctionDef
addMissingPositions
%
category: 'other'
method: PyFunctionDef
initialize
	"FunctionDef(identifier name, arguments args, stmt* body, expr* decorator_list, expr? returns)"

	| stream next |
	stream := self stream.
	(stream peekFor: $') ifFalse: [self error].
	name := stream upTo: $'.
	self commaSpace.
	args := PyArguments parent: self.
	self commaSpace.
	body := self suite. 
	self commaSpace.
	decorator_list :=  self collectAst: [self expression.].
	self commaSpace.
	(stream peekFor: $') ifTrue: [
		returns := self expression.
	] ifFalse: [
		next := stream next: 4.
		next ~= 'None' ifTrue: [self error.].
	].
	self readPosition.
%
