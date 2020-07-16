! ------------------- Remove existing behavior from PyLambda
expectvalue /Metaclass3       
doit
PyLambda removeAllMethods.
PyLambda class removeAllMethods.
%
! ------------------- Class methods for PyLambda
! ------------------- Instance methods for PyLambda
set compile_env: 0
category: 'other'
method: PyLambda
children

	^super children
		add: args;
		add: body;
		yourself
%
category: 'other'
method: PyLambda
initialize
	"Lambda(arguments args, expr body)"

	args := PyArguments parent: self.
	self commaSpace.
	body := self expression.
	self readPosition.
%
